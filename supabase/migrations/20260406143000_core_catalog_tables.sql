create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  stock_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_barbershop_idx on public.customers(barbershop_id);
create index if not exists customers_email_idx on public.customers(email);
create index if not exists barbers_barbershop_idx on public.barbers(barbershop_id);
create index if not exists services_barbershop_idx on public.services(barbershop_id);
create index if not exists products_barbershop_idx on public.products(barbershop_id);

alter table public.customers enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;

drop policy if exists customers_tenant_policy on public.customers;
create policy customers_tenant_policy
on public.customers
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));

drop policy if exists barbers_tenant_policy on public.barbers;
create policy barbers_tenant_policy
on public.barbers
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));

drop policy if exists services_tenant_policy on public.services;
create policy services_tenant_policy
on public.services
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));

drop policy if exists products_tenant_policy on public.products;
create policy products_tenant_policy
on public.products
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));
