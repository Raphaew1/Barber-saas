param(
  [string]$ProjectRef = "kgpsfbuurggwmpcxrfpa",
  [string]$Origin = "http://localhost:5500",
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Invoke-EdgeRequest {
  param(
    [string]$Name,
    [string]$Method,
    [hashtable]$Headers,
    [string]$Body = ""
  )

  $url = "https://$ProjectRef.supabase.co/functions/v1/$Name"

  try {
    $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $Headers -Body $Body -UseBasicParsing
    return [pscustomobject]@{
      Name = $Name
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
        Name = $Name
        Method = $Method
        StatusCode = [int]$resp.StatusCode
        Headers = $resp.Headers
        Body = $content
        Error = $_.Exception.Message
      }
    }

    return [pscustomobject]@{
      Name = $Name
      Method = $Method
      StatusCode = 0
      Headers = @{}
      Body = ""
      Error = $_.Exception.Message
    }
  }
}

function Show-EdgeResult {
  param(
    [object]$Result
  )

  Write-Host ""
  Write-Host "Function: $($Result.Name) | Method: $($Result.Method)" -ForegroundColor Cyan
  Write-Host "Status: $($Result.StatusCode)"

  $allowOrigin = $Result.Headers["Access-Control-Allow-Origin"]
  $allowMethods = $Result.Headers["Access-Control-Allow-Methods"]
  $allowHeaders = $Result.Headers["Access-Control-Allow-Headers"]

  Write-Host "Access-Control-Allow-Origin: $allowOrigin"
  Write-Host "Access-Control-Allow-Methods: $allowMethods"
  Write-Host "Access-Control-Allow-Headers: $allowHeaders"

  if ($Result.Error) {
    Write-Host "Error: $($Result.Error)" -ForegroundColor Yellow
  }

  if ($Result.Body) {
    Write-Host "Body: $($Result.Body)"
  }
}

function Test-EdgeResult {
  param(
    [object]$Result,
    [bool]$Protected = $false
  )

  $allowOrigin = [string]$Result.Headers["Access-Control-Allow-Origin"]
  $allowMethods = [string]$Result.Headers["Access-Control-Allow-Methods"]
  $allowHeaders = [string]$Result.Headers["Access-Control-Allow-Headers"]

  $hasCorsOrigin = -not [string]::IsNullOrWhiteSpace($allowOrigin)
  $hasCorsMethods = -not [string]::IsNullOrWhiteSpace($allowMethods)
  $hasCorsHeaders = -not [string]::IsNullOrWhiteSpace($allowHeaders)
  $statusOk = $Result.StatusCode -eq 200
  $bodyText = [string]$Result.Body
  $authRequired = $Protected -and $Result.Method -eq "POST" -and (
    $Result.StatusCode -eq 401 -and (
      $bodyText -match "Missing authorization header" -or
      $bodyText -match "Authorization header ausente"
    )
  )
  $corsOk = if ($Result.Method -eq "OPTIONS") {
    $hasCorsOrigin -and $hasCorsMethods -and $hasCorsHeaders
  } else {
    $hasCorsOrigin -and $hasCorsHeaders
  }
  $ok = if ($Result.Method -eq "OPTIONS") {
    $statusOk -and $corsOk
  } elseif ($authRequired) {
    $corsOk
  } else {
    $statusOk -and $corsOk
  }

  return [pscustomobject]@{
    name = $Result.Name
    method = $Result.Method
    statusCode = $Result.StatusCode
    statusOk = $statusOk
    hasCorsOrigin = $hasCorsOrigin
    hasCorsMethods = $hasCorsMethods
    hasCorsHeaders = $hasCorsHeaders
    authRequired = $authRequired
    protected = $Protected
    corsOk = $corsOk
    body = $Result.Body
    error = $Result.Error
    ok = $ok
  }
}

$preflightHeaders = @{
  Origin = $Origin
  "Access-Control-Request-Method" = "POST"
  "Access-Control-Request-Headers" = "authorization, x-client-info, apikey, content-type"
}

$postHeaders = @{
  Origin = $Origin
  "Content-Type" = "application/json"
}

$checks = @(
  @{ Name = "get-my-context"; PostBody = "{}"; Protected = $true },
  @{ Name = "create-barbershop"; PostBody = '{"name":"Teste CORS"}'; Protected = $true }
)

if (-not $Json) {
  Write-Host "Verificando Edge Functions do projeto $ProjectRef com origem $Origin" -ForegroundColor Green
}

$summary = @()

foreach ($check in $checks) {
  $preflightResult = Invoke-EdgeRequest -Name $check.Name -Method "OPTIONS" -Headers $preflightHeaders
  $postResult = Invoke-EdgeRequest -Name $check.Name -Method "POST" -Headers $postHeaders -Body $check.PostBody

  if (-not $Json) {
    Show-EdgeResult -Result $preflightResult
    Show-EdgeResult -Result $postResult
  }

  $summary += Test-EdgeResult -Result $preflightResult -Protected ([bool]$check.Protected)
  $summary += Test-EdgeResult -Result $postResult -Protected ([bool]$check.Protected)
}

if ($Json) {
  $summary | ConvertTo-Json -Depth 5
}
