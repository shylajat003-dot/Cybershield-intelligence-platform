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
Write-Host "All credentials are read via masked inputs (*)." -ForegroundColor Gray
Write-Host "Credentials exist only in process memory - NEVER written to disk.`n" -ForegroundColor Gray

# 1. Prompt for Render API Key if not present in environment
$renderKey = $env:RENDER_API_KEY
if (-not $renderKey) {
    $secRender = Read-Host "Enter Render API Key (from dashboard.render.com/account/api-keys)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secRender)
    $renderKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

# 2. Prompt for Vercel Token if not present in environment
$vercelToken = $env:VERCEL_TOKEN
if (-not $vercelToken) {
    $secVercel = Read-Host "Enter Vercel Token (from vercel.com/account/tokens)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secVercel)
    $vercelToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

# 3. Prompt for Admin Test Password (never hardcoded in source)
$adminPassword = $env:CYBERSHIELD_ADMIN_PASSWORD
if (-not $adminPassword) {
    $secPass = Read-Host "Enter CyberShield Admin Password (for live authentication test)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass)
    $adminPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $renderKey -or -not $vercelToken -or -not $adminPassword) {
    Write-Host "❌ Error: Render API Key, Vercel Token, and Admin Password are all required." -ForegroundColor Red
    exit 1
}

# Set in-memory environment variables for child process execution
$env:RENDER_API_KEY = $renderKey
$env:VERCEL_TOKEN = $vercelToken
$env:CYBERSHIELD_ADMIN_PASSWORD = $adminPassword

Write-Host "`n✅ All credentials loaded into process memory only." -ForegroundColor Green
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
    Remove-Item env:CYBERSHIELD_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    $renderKey = $null
    $vercelToken = $null
    $adminPassword = $null
    [System.GC]::Collect()
    Write-Host "🔒 Process memory purged." -ForegroundColor Gray
}
