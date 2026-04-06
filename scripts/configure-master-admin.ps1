param(
  [string]$ProjectRef = "kgpsfbuurggwmpcxrfpa",
  [string]$MasterAdminEmail = "raphacom.web@gmail.com"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Configurando Master Admin ===" -ForegroundColor Cyan
Write-Host "Email: $MasterAdminEmail" -ForegroundColor Yellow
Write-Host "Projeto: $ProjectRef" -ForegroundColor Yellow
Write-Host ""

# 1. Verificar se supabase CLI está disponível
Write-Host "Verificando Supabase CLI..." -ForegroundColor Cyan
try {
  $version = npx -y supabase@latest --version 2>$null
  Write-Host "✓ Supabase CLI OK" -ForegroundColor Green
} catch {
  Write-Host "✗ Erro: Supabase CLI não encontrado" -ForegroundColor Red
  exit 1
}

# 2. Obter o user_id do master admin
Write-Host ""
Write-Host "Buscando user_id de $MasterAdminEmail..." -ForegroundColor Cyan

$getUserQuery = "SELECT id FROM auth.users WHERE email = '$MasterAdminEmail' LIMIT 1;"
$getUserResult = npx -y supabase@latest query "$getUserQuery" --project-id $ProjectRef 2>&1

if ($LASTEXITCODE -ne 0 -or -not $getUserResult) {
  Write-Host "✗ Erro: Usuário $MasterAdminEmail não encontrado no Supabase Auth" -ForegroundColor Red
  Write-Host "  Você precisa criar este usuário primeiro em Supabase Dashboard > Authentication > Users" -ForegroundColor Yellow
  exit 1
}

# Extrair o user_id
if ($getUserResult -match "([a-f0-9\-]{36})") {
  $userId = $matches[1]
  Write-Host "✓ User ID encontrado: $userId" -ForegroundColor Green
} else {
  Write-Host "✗ Erro ao parsear user_id da resposta" -ForegroundColor Red
  Write-Host "Resposta: $getUserResult" -ForegroundColor Yellow
  exit 1
}

# 3. Configurar profiles com global_role = 'super_admin'
Write-Host ""
Write-Host "Configurando profile como super_admin..." -ForegroundColor Cyan

$upsertQuery = @"
INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('$userId', '$MasterAdminEmail', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = '$MasterAdminEmail',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();
"@

$upsertResult = npx -y supabase@latest query "$upsertQuery" --project-id $ProjectRef 2>&1

if ($LASTEXITCODE -ne 0) {
  Write-Host "✗ Erro ao atualizar profile" -ForegroundColor Red
  Write-Host "Detalhes: $upsertResult" -ForegroundColor Yellow
  exit 1
}

Write-Host "✓ Profile configurado como super_admin" -ForegroundColor Green

# 4. Verificar se aplicou
Write-Host ""
Write-Host "Verificando configuração..." -ForegroundColor Cyan

$verifyQuery = "SELECT id, email, global_role, status FROM public.profiles WHERE email = '$MasterAdminEmail';"
$verifyResult = npx -y supabase@latest query "$verifyQuery" --project-id $ProjectRef 2>&1

if ($verifyResult -match "super_admin" -and $verifyResult -match "active") {
  Write-Host "✓ Configuração verificada com sucesso!" -ForegroundColor Green
  Write-Host ""
  Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
  Write-Host $verifyResult -ForegroundColor Green
} else {
  Write-Host "⚠ Não foi possível verificar a configuração" -ForegroundColor Yellow
  Write-Host "Resultado: $verifyResult" -ForegroundColor Yellow
}

# 5. Adicionar acesso a todas as barbearias existentes (opcional)
Write-Host ""
Write-Host "Adicionando acesso admin a todas as barbearias existentes..." -ForegroundColor Cyan

$accessQuery = @"
INSERT INTO public.user_access (user_id, barbershop_id, role, status, approved_by, created_at, updated_at)
SELECT '$userId', id, 'admin', 'active', '$userId', now(), now()
FROM public.barbershops
ON CONFLICT (user_id, barbershop_id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  approved_by = '$userId',
  updated_at = now();
"@

$accessResult = npx -y supabase@latest query "$accessQuery" --project-id $ProjectRef 2>&1

if ($LASTEXITCODE -eq 0) {
  Write-Host "✓ Acesso de admin adicionado a todas as barbearias" -ForegroundColor Green
} else {
  Write-Host "⚠ Aviso: Não foi possível adicionar acesso a barbearias (tabela pode estar vazia)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== CONCLUSÃO ===" -ForegroundColor Green
Write-Host "$MasterAdminEmail agora é master admin com permissões globais!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Faça login no portal com $MasterAdminEmail" -ForegroundColor Yellow
Write-Host "2. Atualize a página ou abra uma nova aba" -ForegroundColor Yellow
Write-Host "3. Tente criar uma barbearia novamente" -ForegroundColor Yellow
