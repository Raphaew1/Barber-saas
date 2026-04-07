alter table public.barbers
  add column if not exists profile_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists phone text,
  add column if not exists photo_url text,
  add column if not exists work_start_time time not null default '09:00',
  add column if not exists work_end_time time not null default '19:00',
  add column if not exists work_days text[] not null default array['monday','tuesday','wednesday','thursday','friday','saturday']::text[],
  add column if not exists status text not null default 'active',
  add column if not exists notes text;

create index if not exists barbers_profile_user_idx on public.barbers(profile_user_id);

alter table public.customers
  add column if not exists notes text;

alter table public.services
  add column if not exists is_active boolean not null default true;

alter table public.appointments
  add column if not exists confirmed_at timestamptz;

create table if not exists public.barber_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  block_type text not null default 'custom',
  is_all_day boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barber_schedule_blocks_type_check check (block_type in ('custom', 'lunch', 'day_off', 'time_off')),
  constraint barber_schedule_blocks_range_check check (ends_at > starts_at)
);

create index if not exists barber_schedule_blocks_barber_idx on public.barber_schedule_blocks(barber_id, starts_at);
create index if not exists barber_schedule_blocks_barbershop_idx on public.barber_schedule_blocks(barbershop_id);

alter table public.barber_schedule_blocks enable row level security;

drop policy if exists barber_schedule_blocks_tenant_policy on public.barber_schedule_blocks;
create policy barber_schedule_blocks_tenant_policy
on public.barber_schedule_blocks
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));
