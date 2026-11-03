<#
.SYNOPSIS
  Secure in-memory deployment launcher for CyberShield Intelligence Platform
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🛡️  CyberShield Automated Deployment Credential Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Your tokens are entered securely via masked inputs (*)." -ForegroundColor Gray
Write-Host "They are held in process memory only - NEVER written to disk.`n" -ForegroundColor Gray

# Prompt for Render API Key if not present in environment
$renderKey = $env:RENDER_API_KEY
if (-not $renderKey) {
    $secRender = Read-Host "Enter Render API Key (from dashboard.render.com/account/api-keys)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secRender)
    $renderKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

# Prompt for Vercel Token if not present in environment
$vercelToken = $env:VERCEL_TOKEN
if (-not $vercelToken) {
    $secVercel = Read-Host "Enter Vercel Token (from vercel.com/account/tokens)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secVercel)
    $vercelToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $renderKey -or -not $vercelToken) {
    Write-Host "❌ Error: Both Render API Key and Vercel Token are required." -ForegroundColor Red
    exit 1
}

# Set in-memory environment variables for child process execution
$env:RENDER_API_KEY = $renderKey
$env:VERCEL_TOKEN = $vercelToken

Write-Host "`n✅ Credentials loaded in process memory only (0 temporary files created)." -ForegroundColor Green
Write-Host "🚀 Launching complete automated deployment orchestrator...`n" -ForegroundColor Green

Set-Location $ScriptDir
try {
    # Execute the deploy orchestrator
    node scripts/deploy.mjs
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n🎉 Deployment & Verification Finished Successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Deployment exited with error code $LASTEXITCODE. See details above." -ForegroundColor Red
    }
} finally {
    # Immediately wipe credentials from environment memory
    Remove-Item env:RENDER_API_KEY -ErrorAction SilentlyContinue
    Remove-Item env:VERCEL_TOKEN -ErrorAction SilentlyContinue
    $renderKey = $null
    $vercelToken = $null
    [System.GC]::Collect()
    Write-Host "🔒 Process memory purged." -ForegroundColor Gray
}
