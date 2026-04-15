# Install Rust toolchain for Jarvis Nebula (Windows).
#
# Tauri requires the Rust toolchain (cargo, rustc). This script downloads
# rustup-init.exe and runs the default installation. Re-run it is safe —
# rustup will no-op if Rust is already installed.
#
# Usage: pwsh -ExecutionPolicy Bypass -File .\scripts\install-rust.ps1

$ErrorActionPreference = "Stop"

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (Test-Command "cargo") {
    Write-Host "cargo already installed: $(cargo --version)" -ForegroundColor Green
    exit 0
}

Write-Host "Rust toolchain not found. Downloading rustup-init.exe..." -ForegroundColor Cyan

$InstallerPath = Join-Path $env:TEMP "rustup-init.exe"
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $InstallerPath

Write-Host "Running rustup-init.exe with default profile..." -ForegroundColor Cyan
& $InstallerPath -y --default-toolchain stable --profile default

Remove-Item $InstallerPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Installed. Open a NEW terminal and verify with:" -ForegroundColor Green
Write-Host "    cargo --version"
Write-Host "    rustc --version"
Write-Host ""
Write-Host "Then from the project root:"
Write-Host "    npm run tauri:dev"
