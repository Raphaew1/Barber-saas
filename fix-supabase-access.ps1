# Script PowerShell para corrigir acesso ao Supabase
# Este script executa todas as correções necessárias no banco de dados

Write-Host "🔧 Iniciando correções no Supabase..." -ForegroundColor Cyan

# Configurações do Supabase
$SUPABASE_URL = "https://kgpsfbuurggwmpcxrfpa.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA5NzAyNDAwLCJleHAiOjE4Njc0Njg0MDB9.5aCVplK1T5V1BsZl6p4z3eV-8YvmXIZK5NvGTlUZ5DY"

# SQL para executar
$SQL_SCRIPT = @"
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
do `$$
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
end `$$;

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
VALUES ('9fdb7e92-9e0b-4630-874c-796515e90d8f', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = 'raphacom.web@gmail.com',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();
"@

Write-Host "📝 SQL preparado para execução..." -ForegroundColor Yellow

# Função para executar SQL via REST API
function Execute-Sql {
    param([string]$sql)

    Write-Host "🔄 Executando SQL no Supabase..." -ForegroundColor Yellow

    try {
        $body = @{
            query = $sql
        } | ConvertTo-Json

        $headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "apikey" = $SUPABASE_ANON_KEY
        }

        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body

        Write-Host "✅ SQL executado com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Erro ao executar SQL: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Executar o SQL
if (Execute-Sql -sql $SQL_SCRIPT) {
    Write-Host "`n🎉 Todas as correções foram aplicadas com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Resumo das correções:" -ForegroundColor Cyan
    Write-Host "  ✓ Tabelas 'profiles' e 'barbershops' criadas/verifiadas" -ForegroundColor Green
    Write-Host "  ✓ Constraints e validações aplicadas" -ForegroundColor Green
    Write-Host "  ✓ Row Level Security (RLS) habilitado" -ForegroundColor Green
    Write-Host "  ✓ Políticas RLS configuradas" -ForegroundColor Green
    Write-Host "  ✓ Perfil configurado como super_admin" -ForegroundColor Green

    Write-Host "`n🔐 Agora você deve conseguir logar novamente!" -ForegroundColor Green
    Write-Host "   Email: raphacom.web@gmail.com" -ForegroundColor Yellow
    Write-Host "   Role: super_admin" -ForegroundColor Yellow

    Write-Host "`n🧪 Teste o acesso executando:" -ForegroundColor Cyan
    Write-Host "   node test-now.js" -ForegroundColor White
} else {
    Write-Host "`n❌ Falha ao aplicar correções. Tente executar manualmente no dashboard:" -ForegroundColor Red
    Write-Host "   https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql" -ForegroundColor Yellow
    Write-Host "`n📄 SQL para colar:" -ForegroundColor Cyan
    Write-Host $SQL_SCRIPT -ForegroundColor White
}