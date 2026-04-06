create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_user_id uuid references auth.users(id) on delete set null,
  appointment_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'finalized', 'cancelled')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_barbershop_idx on public.appointments(barbershop_id);
create index if not exists appointments_barber_time_idx on public.appointments(barber_id, appointment_time);
create index if not exists appointments_customer_email_idx on public.appointments(customer_email);

alter table public.appointments enable row level security;

drop policy if exists appointments_tenant_policy on public.appointments;
drop policy if exists appointments_select_policy on public.appointments;
drop policy if exists appointments_insert_policy on public.appointments;
drop policy if exists appointments_update_policy on public.appointments;
create policy appointments_tenant_policy
on public.appointments
for all
using (
  public.has_barbershop_profile_access(barbershop_id)
  or customer_user_id = auth.uid()
  or lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
)
with check (
  public.has_barbershop_profile_access(barbershop_id)
  or customer_user_id = auth.uid()
  or lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
);
