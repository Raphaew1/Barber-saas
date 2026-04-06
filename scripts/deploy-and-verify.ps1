param(
  [string]$ProjectRef = "kgpsfbuurggwmpcxrfpa",
  [string]$Origin = "http://localhost:5500"
)

$ErrorActionPreference = "Stop"

$functionsToDeploy = @(
  "get-my-context",
  "create-barbershop"
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$verifyScript = Join-Path $scriptRoot "verify-edge-functions.ps1"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-StepResult {
  param(
    [string]$Prefix,
    [string]$Name,
    [bool]$Ok,
    [string]$Details = ""
  )

  $statusLabel = if ($Ok) { "OK" } else { "FAIL" }
  $color = if ($Ok) { "Green" } else { "Red" }
  $suffix = if ([string]::IsNullOrWhiteSpace($Details)) { "" } else { " ($Details)" }
  Write-Host "[$Prefix] $Name -> $statusLabel$suffix" -ForegroundColor $color
}

function Test-SupabaseCli {
  $localCommand = "npx -y supabase@latest --version"

  try {
    $version = Invoke-Expression $localCommand 2>$null
    return [pscustomobject]@{
      ok = $true
      command = "npx -y supabase@latest"
      version = ($version | Select-Object -Last 1)
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      command = ""
      version = ""
      error = $_.Exception.Message
    }
  }
}

function Invoke-SupabaseCommand {
  param(
    [string]$BaseCommand,
    [string]$Arguments
  )

  $command = "$BaseCommand $Arguments"

  try {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/c $command"
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    [void]$process.Start()

    $stdOut = $process.StandardOutput.ReadToEnd()
    $stdErr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    $exitCode = $process.ExitCode
    $combinedOutput = @($stdOut, $stdErr) -join [Environment]::NewLine
    return [pscustomobject]@{
      ok = ($exitCode -eq 0)
      output = $combinedOutput.Trim()
      command = $command
      exitCode = $exitCode
    }
  } catch {
    $captured = $_ | Out-String
    return [pscustomobject]@{
      ok = $false
      output = $captured.Trim()
      command = $command
      exitCode = 1
    }
  }
}

function Test-SupabaseAuth {
  param(
    [string]$BaseCommand
  )

  if ($env:SUPABASE_ACCESS_TOKEN) {
    return [pscustomobject]@{
      ok = $true
      source = "SUPABASE_ACCESS_TOKEN"
    }
  }

  $probe = Invoke-SupabaseCommand -BaseCommand $BaseCommand -Arguments "projects list"
  if ($probe.ok) {
    return [pscustomobject]@{
      ok = $true
      source = "CLI session"
    }
  }

  return [pscustomobject]@{
    ok = $false
    source = ""
    error = $probe.output
  }
}

function Parse-VerifyResults {
  param(
    [string]$JsonText
  )

  if ([string]::IsNullOrWhiteSpace($JsonText)) {
    return @()
  }

  $trimmed = [string]$JsonText
  $jsonStart = $trimmed.IndexOf("[")
  if ($jsonStart -lt 0) {
    $jsonStart = $trimmed.IndexOf("{")
  }

  if ($jsonStart -gt 0) {
    $trimmed = $trimmed.Substring($jsonStart)
  }

  $parsed = $trimmed | ConvertFrom-Json
  if ($parsed -is [System.Array]) {
    return $parsed
  }

  return @($parsed)
}

$summary = [ordered]@{
  cli = $false
  authenticated = $false
  linked = $false
  deploy = @{}
  tests = @{}
}

Write-Section "CLI"
$cli = Test-SupabaseCli
if (-not $cli.ok) {
  Write-StepResult -Prefix "CLI" -Name "supabase" -Ok $false -Details "CLI nao encontrada"
  Write-Host $cli.error -ForegroundColor Yellow
  Write-Host ""
  Write-Host "FINAL STATUS: ERROR DETECTED" -ForegroundColor Red
  exit 1
}

$summary.cli = $true
Write-StepResult -Prefix "CLI" -Name "supabase" -Ok $true -Details $cli.version

Write-Section "AUTH"
$auth = Test-SupabaseAuth -BaseCommand $cli.command
if (-not $auth.ok) {
  Write-StepResult -Prefix "AUTH" -Name "Supabase" -Ok $false -Details "nao autenticado"
  Write-Host $auth.error -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Execute antes: npx supabase@latest login" -ForegroundColor Yellow
  Write-Host "FINAL STATUS: ERROR DETECTED" -ForegroundColor Red
  exit 1
}

$summary.authenticated = $true
Write-StepResult -Prefix "AUTH" -Name "Supabase" -Ok $true -Details $auth.source

Write-Section "LINK"
$linkResult = Invoke-SupabaseCommand -BaseCommand $cli.command -Arguments "link --project-ref $ProjectRef --workdir `"$projectRoot`""
$summary.linked = $linkResult.ok
Write-StepResult -Prefix "LINK" -Name $ProjectRef -Ok $linkResult.ok
if (-not $linkResult.ok) {
  Write-Host $linkResult.output -ForegroundColor Yellow
}

Write-Section "DEPLOY"
foreach ($fn in $functionsToDeploy) {
  $deployResult = Invoke-SupabaseCommand -BaseCommand $cli.command -Arguments "functions deploy $fn --project-ref $ProjectRef --workdir `"$projectRoot`""
  $summary.deploy[$fn] = $deployResult.ok
  Write-StepResult -Prefix "DEPLOY" -Name $fn -Ok $deployResult.ok

  if (-not $deployResult.ok) {
    Write-Host $deployResult.output -ForegroundColor Yellow
  }
}

Write-Section "VERIFY"
$verifyOutput = & powershell -ExecutionPolicy Bypass -File $verifyScript -ProjectRef $ProjectRef -Origin $Origin -Json
$verifyResults = Parse-VerifyResults -JsonText ($verifyOutput | Out-String)

foreach ($fn in $functionsToDeploy) {
  $summary.tests[$fn] = [ordered]@{}
  foreach ($method in @("OPTIONS", "POST")) {
    $testResult = $verifyResults | Where-Object { $_.name -eq $fn -and $_.method -eq $method } | Select-Object -First 1
    if (-not $testResult) {
      $summary.tests[$fn][$method] = $false
      Write-StepResult -Prefix "TEST" -Name "$fn $method" -Ok $false -Details "sem retorno"
      continue
    }

    $details = @()
    if (-not $testResult.statusOk) {
      $details += "HTTP $($testResult.statusCode)"
    }
    if (-not $testResult.hasCorsOrigin) {
      $details += "sem Allow-Origin"
    }
    if (-not $testResult.hasCorsMethods) {
      $details += "sem Allow-Methods"
    }
    if (-not $testResult.hasCorsHeaders) {
      $details += "sem Allow-Headers"
    }
    if ($testResult.authRequired) {
      $details += "auth obrigatoria"
    }
    if ($testResult.error) {
      $details += $testResult.error
    }

    $ok = [bool]$testResult.ok
    $summary.tests[$fn][$method] = $ok
    Write-StepResult -Prefix "TEST" -Name "$fn $method" -Ok $ok -Details (($details -join "; ").Trim())
  }
}

$allDeployOk = ($summary.deploy.Values | Where-Object { -not $_ }).Count -eq 0
$allTestsOk = 0 -eq (
  $summary.tests.Values |
    ForEach-Object { $_.Values } |
    Where-Object { -not $_ }
).Count

Write-Section "SUMMARY"
foreach ($fn in $functionsToDeploy) {
  $deployOk = [bool]$summary.deploy[$fn]
  $optionsOk = [bool]$summary.tests[$fn]["OPTIONS"]
  $postOk = [bool]$summary.tests[$fn]["POST"]
  Write-StepResult -Prefix "DEPLOY" -Name $fn -Ok $deployOk
  Write-StepResult -Prefix "TEST" -Name "$fn OPTIONS" -Ok $optionsOk
  Write-StepResult -Prefix "TEST" -Name "$fn POST" -Ok $postOk
}

Write-Host ""
if ($summary.cli -and $summary.authenticated -and $summary.linked -and $allDeployOk -and $allTestsOk) {
  Write-Host "FINAL STATUS: ALL GREEN" -ForegroundColor Green
  exit 0
}

Write-Host "FINAL STATUS: ERROR DETECTED" -ForegroundColor Red
exit 1
