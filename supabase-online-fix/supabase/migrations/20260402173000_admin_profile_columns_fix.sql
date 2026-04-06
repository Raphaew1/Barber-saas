alter table public.profiles
  add column if not exists global_role text not null default 'user';

alter table public.profiles
  add column if not exists status text not null default 'active';

alter table public.barbershops
  add column if not exists status text not null default 'active';

update public.profiles
set global_role = 'user'
where global_role is null;

update public.profiles
set status = 'active'
where status is null;

update public.barbershops
set status = 'active'
where status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_global_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_global_role_check
      check (global_role in ('user', 'super_admin'));
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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbershops_status_check'
  ) then
    alter table public.barbershops
      add constraint barbershops_status_check
      check (status in ('active', 'blocked'));
  end if;
end $$;
