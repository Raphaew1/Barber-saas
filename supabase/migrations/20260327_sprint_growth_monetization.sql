create table if not exists public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  plan_code text not null default 'free' check (plan_code in ('free', 'pro', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  billing_provider text not null default 'manual',
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists saas_subscriptions_barbershop_id_idx
  on public.saas_subscriptions (barbershop_id);

create table if not exists public.appointment_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  customer_name text,
  customer_email text,
  customer_phone text,
  provider text not null default 'stripe' check (provider in ('stripe', 'mbway', 'manual')),
  payment_type text not null default 'deposit' check (payment_type in ('deposit', 'full')),
  amount numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  checkout_reference text,
  created_at timestamptz not null default now()
);

alter table public.saas_subscriptions enable row level security;
alter table public.appointment_payments enable row level security;

drop policy if exists "admin_manage_saas_subscriptions" on public.saas_subscriptions;
create policy "admin_manage_saas_subscriptions"
  on public.saas_subscriptions
  for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "tenant_read_own_subscription" on public.saas_subscriptions;
create policy "tenant_read_own_subscription"
  on public.saas_subscriptions
  for select
  using (public.has_barbershop_role(auth.uid(), barbershop_id, array['admin']));

drop policy if exists "tenant_read_own_appointment_payments" on public.appointment_payments;
create policy "tenant_read_own_appointment_payments"
  on public.appointment_payments
  for select
  using (
    public.has_barbershop_access(auth.uid(), barbershop_id)
    or lower(coalesce(customer_email, '')) = public.current_user_email()
  );

drop policy if exists "tenant_insert_own_appointment_payments" on public.appointment_payments;
create policy "tenant_insert_own_appointment_payments"
  on public.appointment_payments
  for insert
  with check (
    public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
    or lower(coalesce(customer_email, '')) = public.current_user_email()
  );
