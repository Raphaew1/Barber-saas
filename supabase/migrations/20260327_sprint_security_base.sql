-- Sprint 1
-- Base de seguranca + funcao server-side para agendamento

create extension if not exists pgcrypto;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select public.current_user_email() = 'raphacom.web@gmail.com';
$$;

create or replace function public.current_user_barbershop_id()
returns uuid
language sql
stable
as $$
  select p.barbershop_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.barbershops enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.service_sales enable row level security;
alter table public.product_sales enable row level security;
alter table public.barber_access enable row level security;

drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy"
on public.profiles
for select
using (
  public.is_admin_user()
  or id = auth.uid()
  or (
    role = 'cliente'
    and id = auth.uid()
  )
  or (
    role = 'barbeiro'
    and barbershop_id = public.current_user_barbershop_id()
  )
);

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy"
on public.profiles
for update
using (
  public.is_admin_user()
  or id = auth.uid()
)
with check (
  public.is_admin_user()
  or id = auth.uid()
);

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy"
on public.profiles
for insert
with check (
  public.is_admin_user()
  or id = auth.uid()
);

drop policy if exists "barbershops_select_policy" on public.barbershops;
create policy "barbershops_select_policy"
on public.barbershops
for select
using (
  public.is_admin_user()
  or id = public.current_user_barbershop_id()
);

drop policy if exists "barbershops_insert_policy" on public.barbershops;
create policy "barbershops_insert_policy"
on public.barbershops
for insert
with check (
  public.is_admin_user()
);

drop policy if exists "barbershops_update_policy" on public.barbershops;
create policy "barbershops_update_policy"
on public.barbershops
for update
using (
  public.is_admin_user()
  or id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or id = public.current_user_barbershop_id()
);

drop policy if exists "barbers_tenant_policy" on public.barbers;
create policy "barbers_tenant_policy"
on public.barbers
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "services_tenant_policy" on public.services;
create policy "services_tenant_policy"
on public.services
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "products_tenant_policy" on public.products;
create policy "products_tenant_policy"
on public.products
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "customers_tenant_policy" on public.customers;
create policy "customers_tenant_policy"
on public.customers
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "barber_access_tenant_policy" on public.barber_access;
create policy "barber_access_tenant_policy"
on public.barber_access
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "appointments_select_policy" on public.appointments;
create policy "appointments_select_policy"
on public.appointments
for select
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
  or customer_user_id = auth.uid()
  or lower(coalesce(customer_email, '')) = public.current_user_email()
);

drop policy if exists "appointments_insert_policy" on public.appointments;
create policy "appointments_insert_policy"
on public.appointments
for insert
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
  or customer_user_id = auth.uid()
  or lower(coalesce(customer_email, '')) = public.current_user_email()
);

drop policy if exists "appointments_update_policy" on public.appointments;
create policy "appointments_update_policy"
on public.appointments
for update
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "service_sales_tenant_policy" on public.service_sales;
create policy "service_sales_tenant_policy"
on public.service_sales
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

drop policy if exists "product_sales_tenant_policy" on public.product_sales;
create policy "product_sales_tenant_policy"
on public.product_sales
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
)
with check (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

create or replace function public.create_appointment(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_appointment_time timestamptz,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null
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
begin
  select b.barbershop_id
  into v_barbershop_id
  from public.barbers b
  where b.id = p_barber_id;

  if v_barbershop_id is null then
    raise exception 'Barbeiro nao encontrado para o agendamento.';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.barber_id = p_barber_id
      and a.appointment_time = p_appointment_time
      and coalesce(a.status, 'scheduled') <> 'cancelled'
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
      customer_name,
      customer_email,
      customer_user_id,
      barber_id,
      service_id,
      appointment_time,
      barbershop_id,
      status,
      finalized_at
    )
    values (
      gen_random_uuid(),
      p_customer_name,
      lower(nullif(p_customer_email, '')),
      v_customer_user_id,
      p_barber_id,
      v_service_id,
      p_appointment_time,
      v_barbershop_id,
      'scheduled',
      null
    );
  end loop;

  return query
  select a.*
  from public.appointments a
  where a.barber_id = p_barber_id
    and a.appointment_time = p_appointment_time
  order by a.created_at nulls last, a.id;
end;
$$;

revoke all on function public.create_appointment(uuid, uuid[], timestamptz, text, text, text) from public;
grant execute on function public.create_appointment(uuid, uuid[], timestamptz, text, text, text) to authenticated;
