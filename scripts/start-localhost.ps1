param(
  [int]$Port = 5500
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$url = "http://localhost:$Port/index.html"

function Test-PortInUse {
  param([int]$TargetPort)

  $connection = netstat -ano | Select-String ":$TargetPort"
  return [bool]$connection
}

if (-not (Test-PortInUse -TargetPort $Port)) {
  $job = Start-Process -FilePath python -ArgumentList "-m", "http.server", "$Port" -WorkingDirectory $projectRoot -PassThru
  Start-Sleep -Seconds 2
  Write-Host "Servidor iniciado na porta $Port (PID $($job.Id))." -ForegroundColor Green
} else {
  Write-Host "Ja existe um processo ouvindo na porta $Port." -ForegroundColor Yellow
}

try {
  $response = Invoke-WebRequest -UseBasicParsing $url
  Write-Host "URL pronta: $url" -ForegroundColor Cyan
  Write-Host "HTTP Status: $([int]$response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "Falha ao acessar $url" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 1
}
