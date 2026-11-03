<#
.SYNOPSIS
  Secure automated deployment runner for CyberShield Intelligence Platform
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🛡️  CyberShield Automated Deployment Credential Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Your tokens are entered securely via masked inputs (*)." -ForegroundColor Gray
Write-Host "They are NEVER logged or displayed in chat.`n" -ForegroundColor Gray

# Prompt for Render API Key if not already present in environment
$renderKey = $env:RENDER_API_KEY
if (-not $renderKey) {
    $secRender = Read-Host "Enter Render API Key (from dashboard.render.com/account/api-keys)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secRender)
    $renderKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

# Prompt for Vercel Token if not already present in environment
$vercelToken = $env:VERCEL_TOKEN
if (-not $vercelToken) {
    $secVercel = Read-Host "Enter Vercel Token (from vercel.com/account/tokens)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secVercel)
    $vercelToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $renderKey -or -not $vercelToken) {
    Write-Host "❌ Error: Both keys are required to proceed." -ForegroundColor Red
    exit 1
}

# Write securely to local gitignored .deploy-credentials.env
$credsFile = Join-Path $ScriptDir ".deploy-credentials.env"
$credsContent = @"
RENDER_API_KEY=$renderKey
VERCEL_TOKEN=$vercelToken
"@
Set-Content -Path $credsFile -Value $credsContent -Encoding UTF8

Write-Host "`n✅ Credentials loaded securely in memory." -ForegroundColor Green
Write-Host "🚀 Launching complete automated deployment orchestrator...`n" -ForegroundColor Green

# Run Node deploy orchestrator inside a try-finally block for security
Set-Location $ScriptDir
try {
    node scripts/deploy.mjs
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n🎉 Deployment & Verification Finished Successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Deployment encountered an issue. See log above." -ForegroundColor Red
    }
} finally {
    if (Test-Path $credsFile) {
        Remove-Item $credsFile -Force
        Write-Host "🔒 Temporary credentials purged from disk." -ForegroundColor Gray
    }
}

