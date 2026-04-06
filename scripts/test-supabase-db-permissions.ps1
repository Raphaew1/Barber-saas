param(
  [string]$ProjectUrl = "https://kgpsfbuurggwmpcxrfpa.supabase.co",
  [string]$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ",
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Invoke-SupabaseRequest {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [string]$Body = ""
  )

  try {
    if ($Method -in @("GET", "HEAD", "OPTIONS")) {
      $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing
    } else {
      $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -Body $Body -UseBasicParsing
    }
    return [pscustomobject]@{
      Url = $Url
      Method = $Method
      StatusCode = [int]$response.StatusCode
      Headers = $response.Headers
      Body = $response.Content
      Error = $null
    }
  } catch {
    if ($_.Exception.Response) {
      $resp = $_.Exception.Response
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $content = $reader.ReadToEnd()
      return [pscustomobject]@{
        Url = $Url
        Method = $Method
        StatusCode = [int]$resp.StatusCode
        Headers = $resp.Headers
        Body = $content
        Error = $_.Exception.Message
      }
    }

    return [pscustomobject]@{
      Url = $Url
      Method = $Method
      StatusCode = 0
      Headers = @{}
      Body = ""
      Error = $_.Exception.Message
    }
  }
}

function Get-Interpretation {
  param(
    [object]$Result
  )

  switch ($Result.StatusCode) {
    200 { return "reachable" }
    201 { return "created" }
    204 { return "allowed_without_content" }
    400 { return "request_reached_api_but_failed_validation_or_query" }
    401 { return "auth_required_or_token_invalid" }
    403 { return "blocked_by_rls_or_forbidden" }
    404 { return "resource_or_table_not_found" }
    default {
      if ($Result.StatusCode -eq 0) {
        return "network_failure"
      }

      return "unexpected_status"
    }
  }
}

$baseHeaders = @{
  apikey = $AnonKey
  Authorization = "Bearer $AnonKey"
}

$tests = @(
  [pscustomobject]@{
    Name = "auth_settings"
    Url = "$ProjectUrl/auth/v1/settings"
    Method = "GET"
    Headers = @{}
  },
  [pscustomobject]@{
    Name = "profiles_select_anon"
    Url = "$ProjectUrl/rest/v1/profiles?select=id,email,role&limit=1"
    Method = "GET"
    Headers = $baseHeaders
  },
  [pscustomobject]@{
    Name = "barbershops_select_anon"
    Url = "$ProjectUrl/rest/v1/barbershops?select=id,name&limit=1"
    Method = "GET"
    Headers = $baseHeaders
  },
  [pscustomobject]@{
    Name = "user_access_select_anon"
    Url = "$ProjectUrl/rest/v1/user_access?select=user_id,barbershop_id,role&limit=1"
    Method = "GET"
    Headers = $baseHeaders
  },
  [pscustomobject]@{
    Name = "barber_access_select_anon"
    Url = "$ProjectUrl/rest/v1/barber_access?select=email,barbershop_id,is_active&limit=1"
    Method = "GET"
    Headers = $baseHeaders
  },
  [pscustomobject]@{
    Name = "appointments_select_anon"
    Url = "$ProjectUrl/rest/v1/appointments?select=id,customer_name,appointment_time&limit=1"
    Method = "GET"
    Headers = $baseHeaders
  },
  [pscustomobject]@{
    Name = "saas_subscriptions_select_anon"
    Url = "$ProjectUrl/rest/v1/saas_subscriptions?select=barbershop_id,plan_code,status&limit=1"
    Method = "GET"
    Headers = $baseHeaders
  }
)

$results = foreach ($test in $tests) {
  $result = Invoke-SupabaseRequest -Url $test.Url -Method $test.Method -Headers $test.Headers
  [pscustomobject]@{
    name = $test.Name
    method = $test.Method
    url = $test.Url
    statusCode = $result.StatusCode
    interpretation = Get-Interpretation -Result $result
    error = $result.Error
    body = $result.Body
  }
}

if ($Json) {
  $results | ConvertTo-Json -Depth 5
  exit 0
}

Write-Host "Diagnostico de conexao e permissoes do Supabase" -ForegroundColor Green

foreach ($item in $results) {
  Write-Host ""
  Write-Host "[$($item.name)] $($item.statusCode) -> $($item.interpretation)" -ForegroundColor Cyan
  if ($item.error) {
    Write-Host "Erro: $($item.error)" -ForegroundColor Yellow
  }
  if ($item.body) {
    Write-Host "Body: $($item.body)"
  }
}

$connectivityOk = $results | Where-Object { $_.name -eq "auth_settings" -and $_.statusCode -eq 200 }
$missingTables = $results | Where-Object { $_.interpretation -eq "resource_or_table_not_found" }
$blockedTables = $results | Where-Object { $_.interpretation -in @("auth_required_or_token_invalid", "blocked_by_rls_or_forbidden") }

Write-Host ""
if ($connectivityOk) {
  Write-Host "Conexao geral: OK" -ForegroundColor Green
} else {
  Write-Host "Conexao geral: FALHA" -ForegroundColor Red
}

Write-Host "Tabelas bloqueadas para acesso anonimo: $($blockedTables.Count)"
Write-Host "Tabelas ausentes ou nao expostas: $($missingTables.Count)"
