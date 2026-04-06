alter table public.barbershops
  add column if not exists slug text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists logo_url text;

create unique index if not exists barbershops_slug_unique_idx
  on public.barbershops (slug)
  where slug is not null;

with normalized_slugs as (
  select
    id,
    lower(trim(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '-', 'g'))) as base_slug
  from public.barbershops
  where coalesce(slug, '') = ''
),
prepared_slugs as (
  select
    id,
    trim(both '-' from coalesce(nullif(base_slug, ''), 'barbearia-' || substr(id::text, 1, 8))) as normalized_slug
  from normalized_slugs
)
update public.barbershops b
set slug = case
  when exists (
    select 1
    from public.barbershops other
    where other.id <> b.id
      and other.slug = prepared_slugs.normalized_slug
  ) then prepared_slugs.normalized_slug || '-' || substr(b.id::text, 1, 6)
  else prepared_slugs.normalized_slug
end
from prepared_slugs
where b.id = prepared_slugs.id
  and coalesce(b.slug, '') = '';
