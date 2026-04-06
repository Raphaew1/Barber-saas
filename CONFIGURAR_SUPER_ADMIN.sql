-- Query para verificar e criar/atualizar o profile de raphacom.web@gmail.com
-- Execute no Supabase SQL Editor

-- 1. Primeiro, encontrar o user_id no auth.users
SELECT id, email FROM auth.users WHERE email = 'raphacom.web@gmail.com';

-- Copie o ID acima (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

-- 2. Substitua 'COLE_USER_ID_AQUI' abaixo e execute:

INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('COLE_USER_ID_AQUI', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = 'raphacom.web@gmail.com',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();

-- 3. Verificar se funcionou:
SELECT id, email, global_role, status FROM public.profiles WHERE email = 'raphacom.web@gmail.com';

-- Deve mostrar: super_admin | active
