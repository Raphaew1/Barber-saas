# Script para aplicar migração SQL no Supabase
param(
  [string]$ProjectUrl = "https://kgpsfbuurggwmpcxrfpa.supabase.co",
  [string]$ServiceRoleKey = "",
  [string]$SqlFile = ".\apply-missing-tables.sql"
)

if (-not $ServiceRoleKey) {
  Write-Host "⚠️  Service Role Key não fornecida. Este é necessário para executar SQL em produção."
  Write-Host ""
  Write-Host "Para obter a Service Role Key:"
  Write-Host "1. Vá para: https://supabase.com/dashboard/project/kgpsfbuurggwmpcxrfpa"
  Write-Host "2. Settings > API"
  Write-Host "3. Copie 'service_role' key"
  Write-Host ""
  Write-Host "Uso:"
  Write-Host "  .\apply-migration.ps1 -ServiceRoleKey 'sua_service_role_key_aqui'"
  exit 1
}

if (-not (Test-Path $SqlFile)) {
  Write-Host "❌ Arquivo SQL não encontrado: $SqlFile"
  exit 1
}

# Ler o conteúdo do arquivo SQL
$SqlContent = Get-Content -Path $SqlFile -Raw

Write-Host "📝 Lendo arquivo SQL..."
Write-Host "Arquivo: $SqlFile"
Write-Host "Tamanho: $($SqlContent.Length) caracteres"
Write-Host ""

try {
  Write-Host "🔄 Conectando ao Supabase..."
  Write-Host "Projeto: $ProjectUrl"
  Write-Host ""

  # Dividir em queries individuais
  $queries = $SqlContent -split ';' | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('#') }
  
  Write-Host "📊 Total de queries a executar: $($queries.Count)"
  Write-Host ""

  $successCount = 0
  $errorCount = 0

  foreach ($i in 0..($queries.Count - 1)) {
    $query = $queries[$i].Trim()
    
    if ($query) {
      $queryPreview = if ($query.Length -gt 80) { $query.Substring(0, 80) + "..." } else { $query }
      Write-Host "[$($i+1)/$($queries.Count)] Executando: $queryPreview"
      
      try {
        # Fazer requisição para o Supabase REST API
        $response = Invoke-WebRequest -Uri "$ProjectUrl/rest/v1/_query" `
          -Method POST `
          -Headers @{
            "Authorization" = "Bearer $ServiceRoleKey"
            "Content-Type" = "application/json"
            "Apikey" = "sb_live_5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f"
          } `
          -Body (ConvertTo-Json @{ query = $query }) `
          -UseBasicParsing

        if ($response.StatusCode -eq 200) {
          Write-Host "   ✅ OK"
          $successCount++
        } else {
          Write-Host "   ⚠️  Status: $($response.StatusCode)"
        }
      } catch {
        Write-Host "   ❌ Erro: $($_.Exception.Message)"
        $errorCount++
      }

      Write-Host ""
    }
  }

  Write-Host "=" * 60
  Write-Host "📈 Resumo:"
  Write-Host "  ✅ Sucesso: $successCount"
  Write-Host "  ❌ Erros: $errorCount"
  Write-Host "=" * 60

} catch {
  Write-Host "❌ Erro ao conectar ao Supabase:"
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host ""
Write-Host "✨ Migração concluída!"
Write-Host ""
Write-Host "Verifique o progresso em: https://supabase.com/dashboard/project/kgpsfbuurggwmpcxrfpa/editor"