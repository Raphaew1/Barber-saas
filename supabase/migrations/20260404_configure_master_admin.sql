-- Configure raphacom.web@gmail.com como master admin com permissões globais
-- Execute este script no Supabase SQL Editor

-- 1. Encontrar o user_id do master admin no auth.users
-- SELECT id, email FROM auth.users WHERE email = 'raphacom.web@gmail.com';

-- 2. IMPORTANTE: Copie o ID do usuário acima e substitua 'USER_ID_AQUI' abaixo

-- Atualizar ou criar profile do master admin
INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('USER_ID_AQUI', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = 'raphacom.web@gmail.com',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();

-- 3. Se existem barbearias, adicionar admin access para o master admin
-- Isso é opcional - o master admin já tem permissões globais
-- Descomente se quiser também dar acesso direto às barbearias:
/*
INSERT INTO public.user_access (user_id, barbershop_id, role, status, approved_by, created_at, updated_at)
SELECT 'USER_ID_AQUI', id, 'admin', 'active', 'USER_ID_AQUI', now(), now()
FROM public.barbershops
ON CONFLICT (user_id, barbershop_id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = now();
*/

-- 4. Verificar se aplicou corretamente:
-- SELECT id, email, global_role, status FROM public.profiles WHERE email = 'raphacom.web@gmail.com';
