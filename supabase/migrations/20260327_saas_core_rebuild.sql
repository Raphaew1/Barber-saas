create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists global_role text not null default 'user',
  add column if not exists status text not null default 'active',
  add column if not exists last_login_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.barbershops
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists plan_code text not null default 'free',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbershops_plan_code_check'
  ) then
    alter table public.barbershops
      add constraint barbershops_plan_code_check
      check (plan_code in ('free', 'pro', 'premium'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbershops_status_check'
  ) then
    alter table public.barbershops
      add constraint barbershops_status_check
      check (status in ('active', 'blocked'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_global_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_global_role_check
      check (global_role in ('super_admin', 'user'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'blocked', 'pending'));
  end if;
end $$;

create table if not exists public.user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  role text not null,
  status text not null default 'pending',
  invited_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, barbershop_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  role text not null,
  status text not null default 'pending',
  token_hash text not null,
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_barbershop_id uuid references public.barbershops(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_access_role_check'
  ) then
    alter table public.user_access
      add constraint user_access_role_check
      check (role in ('admin', 'barber', 'client'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_access_status_check'
  ) then
    alter table public.user_access
      add constraint user_access_status_check
      check (status in ('active', 'blocked', 'pending'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'invitations_role_check'
  ) then
    alter table public.invitations
      add constraint invitations_role_check
      check (role in ('admin', 'barber', 'client'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'invitations_status_check'
  ) then
    alter table public.invitations
      add constraint invitations_status_check
      check (status in ('pending', 'accepted', 'expired', 'revoked'));
  end if;
end $$;

create unique index if not exists invitations_token_hash_idx on public.invitations(token_hash);
create index if not exists invitations_email_idx on public.invitations(lower(email));
create index if not exists user_access_user_idx on public.user_access(user_id);
create index if not exists user_access_barbershop_idx on public.user_access(barbershop_id);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_target_barbershop_idx on public.audit_logs(target_barbershop_id);

insert into public.user_access (user_id, barbershop_id, role, status, created_at, updated_at)
select
  p.id,
  p.barbershop_id,
  case
    when p.role = 'barbeiro' then 'barber'
    when p.role = 'cliente' then 'client'
    when p.role = 'admin' then 'admin'
    else 'client'
  end,
  case
    when coalesce(p.status, 'active') in ('active', 'blocked', 'pending') then coalesce(p.status, 'active')
    else 'active'
  end,
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
from public.profiles p
where p.barbershop_id is not null
  and p.id is not null
on conflict (user_id, barbershop_id) do nothing;

insert into public.user_access (user_id, barbershop_id, role, status, created_at, updated_at)
select
  p.id,
  ba.barbershop_id,
  'barber',
  case when ba.is_active then 'active' else 'blocked' end,
  coalesce(ba.approved_at, now()),
  now()
from public.barber_access ba
join public.profiles p on lower(p.email) = lower(ba.email)
where ba.barbershop_id is not null
on conflict (user_id, barbershop_id) do nothing;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.global_role = 'super_admin'
      and coalesce(p.status, 'active') = 'active'
  )
  or exists (
    select 1
    from auth.users u
    where u.id = uid
      and lower(u.email) = 'raphacom.web@gmail.com'
  );
$$;

create or replace function public.has_barbershop_access(uid uuid, shop_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_super_admin(uid)
    or exists (
      select 1
      from public.user_access ua
      where ua.user_id = uid
        and ua.barbershop_id = shop_id
        and ua.status = 'active'
    );
$$;

create or replace function public.has_barbershop_role(uid uuid, shop_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select
    public.is_super_admin(uid)
    or exists (
      select 1
      from public.user_access ua
      where ua.user_id = uid
        and ua.barbershop_id = shop_id
        and ua.status = 'active'
        and ua.role = any(allowed_roles)
    );
$$;

create or replace function public.current_barbershop_ids(uid uuid default auth.uid())
returns setof uuid
language sql
stable
as $$
  select ua.barbershop_id
  from public.user_access ua
  where ua.user_id = uid
    and ua.status = 'active'
  union
  select b.id
  from public.barbershops b
  where b.owner_user_id = uid;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists barbershops_touch_updated_at on public.barbershops;
create trigger barbershops_touch_updated_at
before update on public.barbershops
for each row execute procedure public.touch_updated_at();

drop trigger if exists user_access_touch_updated_at on public.user_access;
create trigger user_access_touch_updated_at
before update on public.user_access
for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.barbershops enable row level security;
alter table public.user_access enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;

alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.service_sales enable row level security;
alter table public.product_sales enable row level security;
alter table public.saas_subscriptions enable row level security;
alter table public.appointment_payments enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists profiles_insert_policy on public.profiles;
drop policy if exists barbershops_select_policy on public.barbershops;
drop policy if exists barbershops_insert_policy on public.barbershops;
drop policy if exists barbershops_update_policy on public.barbershops;
drop policy if exists barbers_tenant_policy on public.barbers;
drop policy if exists services_tenant_policy on public.services;
drop policy if exists products_tenant_policy on public.products;
drop policy if exists customers_tenant_policy on public.customers;
drop policy if exists barber_access_tenant_policy on public.barber_access;
drop policy if exists appointments_select_policy on public.appointments;
drop policy if exists appointments_insert_policy on public.appointments;
drop policy if exists appointments_update_policy on public.appointments;
drop policy if exists service_sales_tenant_policy on public.service_sales;
drop policy if exists product_sales_tenant_policy on public.product_sales;
drop policy if exists admin_manage_saas_subscriptions on public.saas_subscriptions;
drop policy if exists tenant_read_own_subscription on public.saas_subscriptions;
drop policy if exists tenant_read_own_appointment_payments on public.appointment_payments;
drop policy if exists tenant_insert_own_appointment_payments on public.appointment_payments;
drop policy if exists admin_manage_access_audit_logs on public.access_audit_logs;

drop policy if exists profiles_self_or_admin_select on public.profiles;
create policy profiles_self_or_admin_select
on public.profiles
for select
using (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
  or exists (
    select 1
    from public.user_access self_access
    join public.user_access target_access
      on target_access.barbershop_id = self_access.barbershop_id
    where self_access.user_id = auth.uid()
      and self_access.status = 'active'
      and self_access.role in ('admin', 'barber')
      and target_access.user_id = profiles.id
  )
);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
using (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
)
with check (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
);

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
on public.profiles
for insert
with check (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
);

drop policy if exists barbershops_select_access on public.barbershops;
create policy barbershops_select_access
on public.barbershops
for select
using (
  public.is_super_admin(auth.uid())
  or public.has_barbershop_access(auth.uid(), id)
  or owner_user_id = auth.uid()
);

drop policy if exists barbershops_admin_manage on public.barbershops;
create policy barbershops_admin_manage
on public.barbershops
for all
using (
  public.is_super_admin(auth.uid())
  or owner_user_id = auth.uid()
)
with check (
  public.is_super_admin(auth.uid())
  or owner_user_id = auth.uid()
);

drop policy if exists user_access_self_or_admin_select on public.user_access;
create policy user_access_self_or_admin_select
on public.user_access
for select
using (
  public.is_super_admin(auth.uid())
  or user_id = auth.uid()
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
);

drop policy if exists user_access_admin_manage on public.user_access;
create policy user_access_admin_manage
on public.user_access
for all
using (
  public.is_super_admin(auth.uid())
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
)
with check (
  public.is_super_admin(auth.uid())
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
);

drop policy if exists invitations_self_or_admin_select on public.invitations;
create policy invitations_self_or_admin_select
on public.invitations
for select
using (
  public.is_super_admin(auth.uid())
  or lower(email) = public.current_user_email()
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
);

drop policy if exists invitations_admin_manage on public.invitations;
create policy invitations_admin_manage
on public.invitations
for all
using (
  public.is_super_admin(auth.uid())
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
)
with check (
  public.is_super_admin(auth.uid())
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
);

drop policy if exists audit_logs_admin_or_tenant_select on public.audit_logs;
create policy audit_logs_admin_or_tenant_select
on public.audit_logs
for select
using (
  public.is_super_admin(auth.uid())
  or (
    target_barbershop_id is not null
    and public.has_barbershop_role(auth.uid(), target_barbershop_id, array['admin'])
  )
);

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert
on public.audit_logs
for insert
with check (
  public.is_super_admin(auth.uid())
  or (
    target_barbershop_id is not null
    and public.has_barbershop_role(auth.uid(), target_barbershop_id, array['admin'])
  )
);

drop policy if exists barbers_tenant_all on public.barbers;
create policy barbers_tenant_all
on public.barbers
for all
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists services_tenant_all on public.services;
create policy services_tenant_all
on public.services
for all
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists products_tenant_all on public.products;
create policy products_tenant_all
on public.products
for all
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists customers_tenant_all on public.customers;
create policy customers_tenant_all
on public.customers
for all
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists appointments_select_access on public.appointments;
create policy appointments_select_access
on public.appointments
for select
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or customer_user_id = auth.uid()
  or lower(coalesce(customer_email, '')) = public.current_user_email()
  or public.is_super_admin(auth.uid())
);

drop policy if exists appointments_insert_access on public.appointments;
create policy appointments_insert_access
on public.appointments
for insert
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or customer_user_id = auth.uid()
  or lower(coalesce(customer_email, '')) = public.current_user_email()
  or public.is_super_admin(auth.uid())
);

drop policy if exists appointments_update_access on public.appointments;
create policy appointments_update_access
on public.appointments
for update
using (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists service_sales_tenant_all on public.service_sales;
create policy service_sales_tenant_all
on public.service_sales
for all
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists product_sales_tenant_all on public.product_sales;
create policy product_sales_tenant_all
on public.product_sales
for all
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or public.is_super_admin(auth.uid())
)
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or public.is_super_admin(auth.uid())
);

drop policy if exists saas_subscriptions_select_access on public.saas_subscriptions;
create policy saas_subscriptions_select_access
on public.saas_subscriptions
for select
using (
  public.is_super_admin(auth.uid())
  or public.has_barbershop_role(auth.uid(), barbershop_id, array['admin'])
);

drop policy if exists saas_subscriptions_admin_manage on public.saas_subscriptions;
create policy saas_subscriptions_admin_manage
on public.saas_subscriptions
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists appointment_payments_select_access on public.appointment_payments;
create policy appointment_payments_select_access
on public.appointment_payments
for select
using (
  public.has_barbershop_access(auth.uid(), barbershop_id)
  or lower(coalesce(customer_email, '')) = public.current_user_email()
);

drop policy if exists appointment_payments_insert_access on public.appointment_payments;
create policy appointment_payments_insert_access
on public.appointment_payments
for insert
with check (
  public.has_barbershop_role(auth.uid(), barbershop_id, array['admin', 'barber'])
  or lower(coalesce(customer_email, '')) = public.current_user_email()
);

create or replace function public.get_my_workspace_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile record;
  v_access jsonb;
begin
  if v_user_id is null then
    raise exception 'Sessao nao autenticada.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'barbershop_id', ua.barbershop_id,
    'role', ua.role,
    'status', ua.status,
    'barbershop_name', b.name,
    'barbershop_status', b.status,
    'plan_code', b.plan_code
  ) order by b.name), '[]'::jsonb)
  into v_access
  from public.user_access ua
  join public.barbershops b on b.id = ua.barbershop_id
  where ua.user_id = v_user_id;

  update public.profiles
  set last_login_at = now()
  where id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'email', coalesce(v_profile.email, public.current_user_email()),
    'name', v_profile.name,
    'global_role', coalesce(v_profile.global_role, 'user'),
    'profile_status', coalesce(v_profile.status, 'active'),
    'access', v_access
  );
end;
$$;

revoke all on function public.get_my_workspace_context() from public;
grant execute on function public.get_my_workspace_context() to authenticated;
