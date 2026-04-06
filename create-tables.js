/**
 * Executar queries SQL diretamente via API
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function executeSQL() {
  console.log('=== Executando Queries SQL ===\n');

  try {
    // Ler token
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado');

    // Headers para requests autenticadas
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY
    };

    // Query para criar/verificar tabelas
    const createTablesQuery = `
      -- Criar extensão se não existir
      create extension if not exists pgcrypto;

      -- Criar tabela profiles se não existir
      create table if not exists public.profiles (
        id uuid references auth.users(id) on delete cascade primary key,
        email text,
        name text,
        phone text,
        barbershop_id uuid,
        role text not null default 'client',
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

        if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
          alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'barber', 'client'));
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
    `;

    console.log('2️⃣  Executando query para criar tabelas...');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql: createTablesQuery })
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log('   ✅ Query executada com sucesso!');
      console.log('   Resultado:', result);
    } else {
      const error = await response.text();
      console.log('   ❌ Erro na execução:', error);

      // Tentar abordagem alternativa - executar via dashboard SQL
      console.log('\n3️⃣  Tentativa alternativa: Execute manualmente no Supabase Dashboard');
      console.log('   Vá para: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql');
      console.log('   Execute a query SQL que foi salva em: create-tables.sql');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

executeSQL();