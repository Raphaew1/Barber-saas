param(
  [string]$ProjectRef = "kgpsfbuurggwmpcxrfpa",
  [string]$Email = "raphacom.web@gmail.com"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Configurando Master Admin ===" -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor Yellow
Write-Host ""

# 1. Obter user_id
Write-Host "1. Obtendo user_id..." -ForegroundColor Cyan

$queryUserid = "SELECT id FROM auth.users WHERE email = '$Email' LIMIT 1;"

$useridResult = npx supabase@latest query "$queryUserid" --project-ref $ProjectRef 2>&1 | Select-String -Pattern "[a-f0-9\-]{36}" 

if (-not $useridResult) {
  Write-Host "Erro: Usuario nao encontrado" -ForegroundColor Red
  exit 1
}

# Extrair user_id
$userid = $useridResult.Matches[0].Value
Write-Host "User ID: $userid" -ForegroundColor Green
Write-Host ""

# 2. Atualizar profile
Write-Host "2. Atualizando profile..." -ForegroundColor Cyan

$upsertQuery = @"
INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at)
VALUES ('$userid', '$Email', 'super_admin', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = '$Email',
  global_role = 'super_admin',
  status = 'active',
  updated_at = now();
"@

$upsertResult = npx supabase@latest query "$upsertQuery" --project-ref $ProjectRef 2>&1

if ($LASTEXITCODE -ne 0) {
  Write-Host "Erro ao atualizar profile" -ForegroundColor Red
  Write-Host $upsertResult -ForegroundColor Yellow
  exit 1
}

Write-Host "Profile atualizado!" -ForegroundColor Green
Write-Host ""

# 3. Verificar
Write-Host "3. Verificando..." -ForegroundColor Cyan

$verifyQuery = "SELECT id, email, global_role, status FROM public.profiles WHERE email = '$Email';"

$verifyResult = npx supabase@latest query "$verifyQuery" --project-ref $ProjectRef 2>&1

if ($verifyResult -match "super_admin" -and $verifyResult -match "active") {
  Write-Host "✓ Configuracao correta!" -ForegroundColor Green
  Write-Host ""
  Write-Host $verifyResult
} else {
  Write-Host "⚠ Problema na verificacao" -ForegroundColor Yellow
  Write-Host $verifyResult
}

Write-Host "=== PROXIMOS PASSOS ===" -ForegroundColor Green
Write-Host "1. Faca logout do app (http://localhost:5500)" -ForegroundColor Yellow
Write-Host "2. Faca login novamente com $Email" -ForegroundColor Yellow
Write-Host "3. Atualize a pagina (F5)" -ForegroundColor Yellow
Write-Host "4. Tente criar uma barbearia" -ForegroundColor Yellow
