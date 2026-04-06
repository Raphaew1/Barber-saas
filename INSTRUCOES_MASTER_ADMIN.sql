-- Guia: Configure raphacom.web@gmail.com como Master Admin
-- ======================================================

-- PASSO 1: Abra o Supabase Dashboard
-- URL: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql/new
-- Vá em SQL Editor e crie uma nova query

-- PASSO 2: Copie e execute este SQL completo abaixo:

-- ==================== INÍCIO DO SQL ====================

-- Buscar o user_id de raphacom.web@gmail.com
-- (Você verá o ID na coluna 'id')
SELECT id, email FROM auth.users WHERE email = 'raphacom.web@gmail.com' LIMIT 1;

-- Agora copie o ID acima (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
-- e substitua 'COLE_O_USER_ID_AQUI' no comando abaixo

-- Atualizar/criar profile como super_admin
INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('COLE_O_USER_ID_AQUI', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = 'raphacom.web@gmail.com',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();

-- VERIFY: Confirme que funcionou
SELECT id, email, global_role, status FROM public.profiles WHERE email = 'raphacom.web@gmail.com';

-- ==================== FIM DO SQL ====================

-- PASSO 3: Adicionar acesso a TODAS as barbearias (opcional)
-- Execute este SQL se quiser dar acesso admin a todas as barbearias existentes:

INSERT INTO public.user_access (user_id, barbershop_id, role, status, approved_by, created_at, updated_at)
SELECT 'COLE_O_USER_ID_AQUI', id, 'admin', 'active', 'COLE_O_USER_ID_AQUI', now(), now()
FROM public.barbershops
ON CONFLICT (user_id, barbershop_id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  approved_by = 'COLE_O_USER_ID_AQUI',
  updated_at = now();

-- Verificar acesso adicionado:
SELECT user_id, barbershop_id, role, status FROM public.user_access 
WHERE user_id = 'COLE_O_USER_ID_AQUI';
