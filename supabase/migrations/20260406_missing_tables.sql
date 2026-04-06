-- Missing tables migration
-- Add tables that are referenced in code but missing from database

-- Create barber_access table
create table if not exists public.barber_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  barbershop_id uuid references public.barbershops(id) on delete cascade,
  is_active boolean not null default false,
  role text not null default 'barber' check (role in ('admin', 'barber')),
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(email, barbershop_id)
);

-- Create service_sales table
create table if not exists public.service_sales (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text,
  service_price numeric(10,2) not null default 0,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  barber_id uuid references public.barbers(id) on delete set null,
  barber_name text,
  created_at timestamptz not null default now()
);

-- Create product_sales table
create table if not exists public.product_sales (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  barber_id uuid references public.barbers(id) on delete set null,
  barber_name text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.barber_access enable row level security;
alter table public.service_sales enable row level security;
alter table public.product_sales enable row level security;

-- Create indexes
create index if not exists barber_access_email_idx on public.barber_access(email);
create index if not exists barber_access_barbershop_idx on public.barber_access(barbershop_id);
create index if not exists service_sales_barbershop_idx on public.service_sales(barbershop_id);
create index if not exists service_sales_appointment_idx on public.service_sales(appointment_id);
create index if not exists product_sales_barbershop_idx on public.product_sales(barbershop_id);
create index if not exists product_sales_appointment_idx on public.product_sales(appointment_id);

-- RLS Policies for barber_access
drop policy if exists "barber_access_tenant_policy" on public.barber_access;
create policy "barber_access_tenant_policy"
on public.barber_access
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

-- RLS Policies for service_sales
drop policy if exists "service_sales_tenant_policy" on public.service_sales;
create policy "service_sales_tenant_policy"
on public.service_sales
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);

-- RLS Policies for product_sales
drop policy if exists "product_sales_tenant_policy" on public.product_sales;
create policy "product_sales_tenant_policy"
on public.product_sales
for all
using (
  public.is_admin_user()
  or barbershop_id = public.current_user_barbershop_id()
);