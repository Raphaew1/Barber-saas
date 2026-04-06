alter table public.profiles
  add column if not exists status text default 'active',
  add column if not exists last_login_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.barbershops
  add column if not exists location text;

create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_email text,
  performed_by_email text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.access_audit_logs enable row level security;

drop policy if exists "admin_manage_access_audit_logs" on public.access_audit_logs;
create policy "admin_manage_access_audit_logs"
  on public.access_audit_logs
  for all
  using (coalesce((select email from public.profiles where id = auth.uid()), '') = 'raphacom.web@gmail.com')
  with check (coalesce((select email from public.profiles where id = auth.uid()), '') = 'raphacom.web@gmail.com');
