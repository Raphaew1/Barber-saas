alter table public.services
  add column if not exists duration_minutes integer not null default 30;

alter table public.appointments
  add column if not exists booking_group_id uuid,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text,
  add column if not exists sync_status text,
  add column if not exists sync_error text,
  add column if not exists synced_at timestamptz,
  add column if not exists source text not null default 'internal';

update public.appointments
set booking_group_id = coalesce(booking_group_id, gen_random_uuid()),
    starts_at = coalesce(starts_at, appointment_time),
    ends_at = coalesce(ends_at, appointment_time + interval '30 minutes'),
    source = coalesce(source, 'internal'),
    sync_status = coalesce(sync_status, 'not_connected')
where booking_group_id is null
   or starts_at is null
   or ends_at is null
   or sync_status is null;

alter table public.appointments
  alter column booking_group_id set not null,
  alter column starts_at set not null,
  alter column ends_at set not null,
  alter column sync_status set default 'not_connected';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_sync_status_check'
  ) then
    alter table public.appointments
      add constraint appointments_sync_status_check
      check (sync_status in ('pending', 'synced', 'failed', 'cancelled', 'not_connected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_source_check'
  ) then
    alter table public.appointments
      add constraint appointments_source_check
      check (source in ('internal', 'google', 'hybrid'));
  end if;
end $$;

create index if not exists appointments_barber_starts_idx on public.appointments(barber_id, starts_at);
create index if not exists appointments_starts_at_idx on public.appointments(starts_at);
create index if not exists appointments_sync_status_idx on public.appointments(sync_status);
create index if not exists appointments_google_event_idx on public.appointments(google_event_id);
create index if not exists appointments_booking_group_idx on public.appointments(booking_group_id);

create table if not exists public.barber_google_integrations (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  profile_user_id uuid references public.profiles(id) on delete set null,
  google_email text,
  google_calendar_id text not null default 'primary',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default array[]::text[],
  is_connected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (barber_id)
);

create index if not exists barber_google_integrations_profile_idx on public.barber_google_integrations(profile_user_id);
create index if not exists barber_google_integrations_connected_idx on public.barber_google_integrations(is_connected);

create table if not exists public.google_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  requested_by_user_id uuid references public.profiles(id) on delete set null,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz
);

create index if not exists google_oauth_states_state_idx on public.google_oauth_states(state);
create index if not exists google_oauth_states_barber_idx on public.google_oauth_states(barber_id);

alter table public.barber_google_integrations enable row level security;
alter table public.google_oauth_states enable row level security;

drop policy if exists barber_google_integrations_tenant_policy on public.barber_google_integrations;
create policy barber_google_integrations_tenant_policy
on public.barber_google_integrations
for all
using (
  exists (
    select 1
    from public.barbers b
    where b.id = barber_google_integrations.barber_id
      and public.has_barbershop_profile_access(b.barbershop_id)
  )
)
with check (
  exists (
    select 1
    from public.barbers b
    where b.id = barber_google_integrations.barber_id
      and public.has_barbershop_profile_access(b.barbershop_id)
  )
);

drop policy if exists google_oauth_states_tenant_policy on public.google_oauth_states;
create policy google_oauth_states_tenant_policy
on public.google_oauth_states
for all
using (
  exists (
    select 1
    from public.barbers b
    where b.id = google_oauth_states.barber_id
      and public.has_barbershop_profile_access(b.barbershop_id)
  )
)
with check (
  exists (
    select 1
    from public.barbers b
    where b.id = google_oauth_states.barber_id
      and public.has_barbershop_profile_access(b.barbershop_id)
  )
);

create or replace function public.create_appointment(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_appointment_time timestamptz,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_booking_group_id uuid default null,
  p_source text default 'internal'
)
returns setof public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barbershop_id uuid;
  v_service_id uuid;
  v_customer_user_id uuid := auth.uid();
  v_total_duration integer := 0;
  v_starts_at timestamptz := coalesce(p_starts_at, p_appointment_time);
  v_ends_at timestamptz := p_ends_at;
  v_booking_group_id uuid := coalesce(p_booking_group_id, gen_random_uuid());
begin
  select b.barbershop_id
  into v_barbershop_id
  from public.barbers b
  where b.id = p_barber_id;

  if v_barbershop_id is null then
    raise exception 'Barbeiro nao encontrado para o agendamento.';
  end if;

  select coalesce(sum(coalesce(duration_minutes, 30)), 0)
  into v_total_duration
  from public.services
  where id = any(p_service_ids);

  if v_total_duration <= 0 then
    v_total_duration := greatest(array_length(p_service_ids, 1), 1) * 30;
  end if;

  if v_ends_at is null then
    v_ends_at := v_starts_at + make_interval(mins => v_total_duration);
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.barber_id = p_barber_id
      and coalesce(a.status, 'scheduled') <> 'cancelled'
      and tstzrange(coalesce(a.starts_at, a.appointment_time), coalesce(a.ends_at, a.appointment_time + interval '30 minutes'), '[)')
          && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Horario ja ocupado para este barbeiro.';
  end if;

  if exists (
    select 1
    from public.services s
    where s.id = any(p_service_ids)
      and s.barbershop_id <> v_barbershop_id
  ) then
    raise exception 'Os servicos precisam pertencer a mesma barbearia do barbeiro.';
  end if;

  foreach v_service_id in array p_service_ids
  loop
    insert into public.appointments (
      id,
      booking_group_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_user_id,
      barber_id,
      service_id,
      appointment_time,
      starts_at,
      ends_at,
      source,
      sync_status,
      barbershop_id,
      status,
      finalized_at
    )
    values (
      gen_random_uuid(),
      v_booking_group_id,
      p_customer_name,
      nullif(p_customer_phone, ''),
      lower(nullif(p_customer_email, '')),
      v_customer_user_id,
      p_barber_id,
      v_service_id,
      v_starts_at,
      v_starts_at,
      v_ends_at,
      coalesce(p_source, 'internal'),
      case when coalesce(p_source, 'internal') = 'google' then 'pending' else 'not_connected' end,
      v_barbershop_id,
      'scheduled',
      null
    );
  end loop;

  return query
  select a.*
  from public.appointments a
  where a.booking_group_id = v_booking_group_id
  order by a.created_at nulls last, a.id;
end;
$$;

revoke all on function public.create_appointment(uuid, uuid[], timestamptz, text, text, text) from public;
grant execute on function public.create_appointment(uuid, uuid[], timestamptz, text, text, text) to authenticated;
grant execute on function public.create_appointment(uuid, uuid[], timestamptz, text, text, text, timestamptz, timestamptz, uuid, text) to authenticated;
