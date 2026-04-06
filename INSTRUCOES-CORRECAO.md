# INSTRUÇÕES PARA CORREÇÃO MANUAL NO SUPABASE

## 🚨 IMPORTANTE: Execute estes passos no seu navegador

### Passo 1: Acesse o SQL Editor do Supabase
1. Abra: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql
2. Faça login na sua conta (se necessário)

### Passo 2: Execute o SQL abaixo
Cole e execute todo o SQL no editor:

```sql
-- Criar extensão se não existir
create extension if not exists pgcrypto;

-- Criar tabela profiles se não existir
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  phone text,
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

  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active', 'inactive'));
  end if;
end $$;

-- Habilitar RLS
alter table public.profiles enable row level security;
alter table public.barbershops enable row level security;

-- Políticas RLS básicas
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Super admins can view all profiles" on public.profiles;
create policy "Super admins can view all profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and global_role = 'super_admin'
    )
  );

drop policy if exists "Super admins can manage barbershops" on public.barbershops;
create policy "Super admins can manage barbershops" on public.barbershops
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and global_role = 'super_admin'
    )
  );

-- Configurar perfil do usuário como super_admin
INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('2115dd42-ea92-4525-8449-322073b49e62', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = 'raphacom.web@gmail.com',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();
```

### Passo 3: Clique em "Run" (ou "Executar")
- Aguarde a execução completar
- Deve aparecer "Success" em verde

### Passo 4: Teste o acesso
Após executar o SQL, teste se funcionou:

```bash
# No terminal, execute:
node test-now.js
```

## 📋 O que este SQL faz:

1. ✅ **Cria tabelas**: `profiles` e `barbershops`
2. ✅ **Adiciona validações**: Constraints para garantir integridade
3. ✅ **Habilita segurança**: Row Level Security (RLS)
4. ✅ **Configura permissões**: Políticas RLS para controle de acesso
5. ✅ **Define super_admin**: Seu perfil como administrador

## 🔧 Se ainda não funcionar:

1. Verifique se executou TODO o SQL
2. Confirme que está no projeto correto: `kgpsfbuurggwmpcxrfpa`
3. Tente fazer logout e login novamente no app
4. Execute `node test-now.js` para verificar

## 📞 Suporte:
Se ainda tiver problemas, me avise o que aconteceu!