$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $projectRoot 'frontend'
$backendDir = Join-Path $projectRoot 'backend'
$composeFile = Join-Path $projectRoot 'infra\docker-compose.yml'
$envFile = Join-Path $projectRoot '.env'

Write-Host 'Jarvis Nebula full local launch' -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $frontendDir 'node_modules'))) {
  Write-Host 'Installing frontend dependencies...' -ForegroundColor Yellow
  npm --prefix $frontendDir install
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host 'Starting Neo4j via Docker Compose...' -ForegroundColor Yellow
  docker compose --env-file $envFile -f $composeFile up -d | Out-Host

  if ($LASTEXITCODE -ne 0) {
    Write-Warning 'Neo4j did not start cleanly. Frontend launch will continue.'
  }
} else {
  Write-Warning 'Docker is not available. Neo4j startup was skipped.'
}

$pythonCommand = $null
$pythonArgs = @()

if (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCommand = 'python'
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  foreach ($candidate in @('-3.11', '-3.13', '-3.10')) {
    & py $candidate -c "import sys" 2>$null
    if ($LASTEXITCODE -eq 0) {
      $pythonCommand = 'py'
      $pythonArgs = @($candidate)
      break
    }
  }
}

if ($pythonCommand) {
  & $pythonCommand @pythonArgs -c "import fastapi, uvicorn" 2>$null

  if ($LASTEXITCODE -eq 0) {
    Write-Host 'Opening backend server window...' -ForegroundColor Yellow

    $backendLaunch = if ($pythonCommand -eq 'py') {
      "Set-Location '$backendDir'; py $($pythonArgs[0]) -m app.main"
    } else {
      "Set-Location '$backendDir'; python -m app.main"
    }

    Start-Process powershell -ArgumentList @(
      '-NoExit',
      '-Command',
      $backendLaunch
    )
  } else {
    Write-Warning 'Backend dependencies are not ready. Backend window was skipped.'
  }
} else {
  Write-Warning 'No Python launcher was found. Backend window was skipped.'
}

Write-Host 'Opening frontend dev server window...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$frontendDir'; npm run dev -- --open"
)

Write-Host 'Launch request finished. Frontend opens in a new window.' -ForegroundColor Green
