-- Query para criar as tabelas básicas do sistema
-- Execute no Supabase SQL Editor: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql

-- Criar extensão se não existir
create extension if not exists pgcrypto;

-- Criar tabela profiles se não existir
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  phone text,
  barbershop_id uuid,
  role text not null default 'client',
  global_role text not null default 'user',
  status text not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Criar tabela barbershops se não existir
create table if not exists public.barbershops (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  email text,
  phone text,
  address text,
  owner_id uuid references auth.users(id),
  plan_code text not null default 'free',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adicionar constraints se não existirem
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'barbershops_plan_code_check') then
    alter table public.barbershops add constraint barbershops_plan_code_check check (plan_code in ('free', 'pro', 'premium'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'barbershops_status_check') then
    alter table public.barbershops add constraint barbershops_status_check check (status in ('active', 'blocked'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_global_role_check') then
    alter table public.profiles add constraint profiles_global_role_check check (global_role in ('super_admin', 'user'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'barber', 'client'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active', 'inactive', 'blocked'));
  end if;
end $$;

-- Habilitar RLS
alter table public.profiles enable row level security;
alter table public.barbershops enable row level security;

-- Políticas RLS básicas
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.is_super_admin_profile() returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and global_role = 'super_admin'
  );
$$;

drop policy if exists "Super admins can manage all profiles" on public.profiles;
create policy "Super admins can manage all profiles" on public.profiles
  for all using (public.is_super_admin_profile())
  with check (public.is_super_admin_profile());

drop policy if exists "Super admins can manage barbershops" on public.barbershops;
create policy "Super admins can manage barbershops" on public.barbershops
  for all using (public.is_super_admin_profile())
  with check (public.is_super_admin_profile());

-- Configurar perfil do usuário como super_admin
INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('2115dd42-ea92-4525-8449-322073b49e62', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = 'raphacom.web@gmail.com',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();