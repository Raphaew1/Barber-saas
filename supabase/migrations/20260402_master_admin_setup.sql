-- Migration: Ensure master admin has super_admin role
-- Date: 2026-04-02
-- Description: Guarantees that the master admin email has super_admin role and active status

-- Insert or update the master admin profile
insert into public.profiles (id, email, global_role, status, created_at, updated_at)
select
  u.id,
  u.email,
  'super_admin',
  'active',
  coalesce(u.created_at, now()),
  now()
from auth.users u
where lower(u.email) = 'raphacom.web@gmail.com'
on conflict (id) do update set
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();

-- Ensure the master admin has access to all barbershops (if needed for admin operations)
-- This is optional but ensures the admin can see all data through tenant policies
insert into public.user_access (user_id, barbershop_id, role, status, created_at, updated_at)
select
  p.id,
  b.id,
  'admin',
  'active',
  now(),
  now()
from public.profiles p
cross join public.barbershops b
where lower(p.email) = 'raphacom.web@gmail.com'
  and p.global_role = 'super_admin'
on conflict (user_id, barbershop_id) do update set
  role = 'admin',
  status = 'active',
  updated_at = now();