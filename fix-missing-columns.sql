-- SQL para adicionar as colunas faltantes na tabela profiles
-- Execute no Supabase SQL Editor: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql

-- Adicionar coluna barbershop_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'barbershop_id') THEN
    ALTER TABLE public.profiles ADD COLUMN barbershop_id uuid;
  END IF;
END $$;

-- Adicionar coluna role se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'client';
  END IF;
END $$;

-- Adicionar coluna global_role se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'global_role') THEN
    ALTER TABLE public.profiles ADD COLUMN global_role text NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Adicionar coluna status se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'status') THEN
    ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Adicionar constraint para global_role se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_global_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_global_role_check
    CHECK (global_role IN ('super_admin', 'user'));
  END IF;
END $$;

-- Adicionar constraint para status se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
    CHECK (status IN ('active', 'blocked'));
  END IF;
END $$;