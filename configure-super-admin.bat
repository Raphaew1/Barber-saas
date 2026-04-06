@echo off
REM Script para configurar master admin via Supabase CLI

echo === Configurando Master Admin ===
echo.

REM 1. Get user_id
echo 1. Obtendo user_id de raphacom.web@gmail.com...

set query="SELECT id FROM auth.users WHERE email = 'raphacom.web@gmail.com' LIMIT 1;"

for /f "delims=" %%a in ('npx supabase@latest query %query% --project-ref kgpsfbuurggwmpcxrfpa 2^>nul') do set result=%%a

if "%result%"=="" (
  echo Erro: Nao foi possivel obter o user_id
  exit /b 1
)

echo %result%
echo.

REM Extract user_id from the result
for /f "tokens=1" %%a in ("%result%") do set userid=%%a

echo User ID encontrado: %userid%
echo.

REM 2. Update profile
echo 2. Atualizando profile como super_admin...

set upsert="INSERT INTO public.profiles (id, email, global_role, status, created_at, updated_at) VALUES ('%userid%', 'raphacom.web@gmail.com', 'super_admin', 'active', now(), now()) ON CONFLICT (id) DO UPDATE SET email = 'raphacom.web@gmail.com', global_role = 'super_admin', status = 'active', updated_at = now();"

npx supabase@latest query "%upsert%" --project-ref kgpsfbuurggwmpcxrfpa

echo.
echo ✓ Profile configurado!
echo.
echo Proximos passos:
echo 1. Faca logout do app
echo 2. Faca login novamente
echo 3. Atualize a pagina (F5)
echo 4. Tente criar uma barbearia
