alter table public.profiles
  add column if not exists can_access_client_portal boolean,
  add column if not exists can_access_barber_portal boolean;

update public.profiles as p
set
  can_access_client_portal = coalesce(
    p.can_access_client_portal,
    true
  ),
  can_access_barber_portal = coalesce(
    p.can_access_barber_portal,
    case
      when lower(coalesce(p.global_role, '')) = 'super_admin' then true
      when lower(coalesce(p.role, '')) in ('admin', 'barbeiro') then true
      when exists (
        select 1
        from public.user_access ua
        where ua.user_id = p.id
          and lower(coalesce(ua.role, '')) in ('admin', 'barber')
          and lower(coalesce(ua.status, 'active')) = 'active'
      ) then true
      when exists (
        select 1
        from public.barber_access ba
        where lower(coalesce(ba.email, '')) = lower(coalesce(p.email, ''))
          and coalesce(ba.is_active, false) = true
      ) then true
      else false
    end
  );

alter table public.profiles
  alter column can_access_client_portal set default true,
  alter column can_access_client_portal set not null,
  alter column can_access_barber_portal set default false,
  alter column can_access_barber_portal set not null;
