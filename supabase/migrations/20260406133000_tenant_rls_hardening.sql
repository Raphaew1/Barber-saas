create or replace function public.current_profile_barbershop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.barbershop_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.has_barbershop_profile_access(target_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin_profile()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.barbershop_id = target_barbershop_id
    )
    or exists (
      select 1
      from public.barbershops b
      where b.id = target_barbershop_id
        and b.owner_id = auth.uid()
    );
$$;

drop policy if exists "Linked users can view own barbershop" on public.barbershops;
create policy "Linked users can view own barbershop"
on public.barbershops
for select
using (public.has_barbershop_profile_access(id));

drop policy if exists barber_access_authenticated_all on public.barber_access;
drop policy if exists barber_access_tenant_all on public.barber_access;
drop policy if exists barber_access_tenant_policy on public.barber_access;
create policy barber_access_tenant_policy
on public.barber_access
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));

drop policy if exists service_sales_authenticated_all on public.service_sales;
drop policy if exists service_sales_tenant_all on public.service_sales;
drop policy if exists service_sales_tenant_policy on public.service_sales;
create policy service_sales_tenant_policy
on public.service_sales
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));

drop policy if exists product_sales_authenticated_all on public.product_sales;
drop policy if exists product_sales_tenant_all on public.product_sales;
drop policy if exists product_sales_tenant_policy on public.product_sales;
create policy product_sales_tenant_policy
on public.product_sales
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));

drop policy if exists saas_subscriptions_authenticated_all on public.saas_subscriptions;
drop policy if exists admin_manage_saas_subscriptions on public.saas_subscriptions;
drop policy if exists tenant_read_own_subscription on public.saas_subscriptions;
drop policy if exists saas_subscriptions_select_access on public.saas_subscriptions;
drop policy if exists saas_subscriptions_admin_manage on public.saas_subscriptions;
create policy saas_subscriptions_tenant_policy
on public.saas_subscriptions
for all
using (public.has_barbershop_profile_access(barbershop_id))
with check (public.has_barbershop_profile_access(barbershop_id));
