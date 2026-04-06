alter table public.barbershops
  add column if not exists owner_password_defined_at timestamptz;
