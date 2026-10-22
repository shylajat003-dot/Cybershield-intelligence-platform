# ------------------------------------------------------------
# setup_mern_final.ps1
# ------------------------------------------------------------
# Purpose: create a clean MERN‑only copy of the current project,
#          remove PostgreSQL references, force persistent MongoDB,
#          and generate Docker‑Compose, README and .env files.
# ------------------------------------------------------------

# -----------------------------------------------------------------
# 0. Define paths – adjust if you move the script.
# -----------------------------------------------------------------
$srcRoot  = "C:\Users\SYS\OneDrive\Documents\fsd projects\cybershield-platform"
$destRoot = "$srcRoot\cybershield-mern-final"

# -----------------------------------------------------------------
# 1. Clean previous copy (if any) – we start fresh.
# -----------------------------------------------------------------
if (Test-Path $destRoot) {
    Write-Host "[INFO] Removing previous copy at $destRoot" -ForegroundColor Yellow
    Remove-Item -Recurse -Force $destRoot
}
New-Item -ItemType Directory -Path $destRoot | Out-Null

# -----------------------------------------------------------------
# 2. Copy everything except node_modules and .git.
# -----------------------------------------------------------------
Write-Host "[INFO] Copying source files…" -ForegroundColor Cyan
robocopy "$srcRoot" "$destRoot" /E /XD "node_modules" ".git" /R:0 /W:0 > $null

# -----------------------------------------------------------------
# 3. Trim .env.example to MongoDB only.
# -----------------------------------------------------------------
$envFile = Join-Path $destRoot "backend\.env.example"
Get-Content $envFile |
    Where-Object { $_ -match '^(MONGODB_URI|REDIS_|JWT_|CORS_|PORT|NODE_ENV)=' } |
    Set-Content $envFile -Encoding UTF8
Write-Host "  • .env.example now contains only MongoDB vars." -ForegroundColor Green

# -----------------------------------------------------------------
# 4. Force persistent MongoDB connection (remove in‑memory fallback).
# -----------------------------------------------------------------
$dbPath = Join-Path $destRoot "backend\src\config\db.ts"
@"
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not defined in .env');
    }
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB at ' + mongoUri);
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);   // abort – we require a real MongoDB server
  }
};
"@ | Set-Content $dbPath -Encoding UTF8
Write-Host "  • db.ts rewritten – only persistent MongoDB" -ForegroundColor Green

# -----------------------------------------------------------------
# 5. Remove PostgreSQL packages from backend/package.json.
# -----------------------------------------------------------------
$pkgPath = Join-Path $destRoot "backend\package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pgDeps = @('pg','pg-mem','@types/pg')
foreach ($d in $pgDeps) {
    $pkg.dependencies.PSObject.Properties.Remove($d)   2>$null
    $pkg.devDependencies.PSObject.Properties.Remove($d) 2>$null
}
$pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath -Encoding UTF8
Write-Host "  • PostgreSQL packages removed from package.json" -ForegroundColor Green

# -----------------------------------------------------------------
# 6. Strip any stray "import … from 'pg'" statements.
# -----------------------------------------------------------------
$backendSrc = Join-Path $destRoot "backend\src"
Get-ChildItem -Path $backendSrc -Recurse -Include *.ts,*.tsx |
    ForEach-Object {
        (Get-Content $_.FullName) -replace "import\s+.*\s+from\s+['\`"]pg['\`"];", "" |
        Set-Content $_.FullName -Encoding UTF8
    }
Write-Host "  • Cleaned possible pg imports" -ForegroundColor Green

# -----------------------------------------------------------------
# 7. Write Docker‑Compose (MongoDB + Redis + MERN services).
# -----------------------------------------------------------------
$docker = @"
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: cybershield-mongodb
    restart: unless-stopped
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: cybershield-redis
    restart: unless-stopped
    ports:
      - '6379:6379'

  backend:
    build: ./backend
    container_name: cybershield-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env.example
    depends_on:
      - mongodb
      - redis
    ports:
      - '5000:5000'

  frontend:
    build: ./frontend
    container_name: cybershield-frontend
    restart: unless-stopped
    env_file:
      - ./frontend/.env.example
    depends_on:
      - backend
    ports:
      - '5173:5173'

volumes:
  mongodb_data:
"@
$dockerPath = Join-Path $destRoot "docker-compose.yml"
$docker | Set-Content $dockerPath -Encoding UTF8
Write-Host "  • docker‑compose.yml created" -ForegroundColor Green

# -----------------------------------------------------------------
# 8. Write concise README.
# -----------------------------------------------------------------
$readme = @"
# CyberShield – MERN Final Project

**Stack**
- MongoDB (primary) – `MONGODB_URI=mongodb://localhost:27017/cybershield`
- Mongoose (ORM)
- Express.js + Node.js (backend) – TypeScript
- React + TypeScript + Vite (frontend)

The folder is a *clean copy* of the original `cybershield‑platform` project, but:
- All PostgreSQL code and packages have been removed.
- The backend now fails fast if a real MongoDB server is not reachable (no in‑memory fallback).
- Docker‑Compose starts MongoDB, Redis, backend, frontend – nothing else.

## Quick start (local dev)

```powershell
cd cybershield-mern-final

# 1️⃣  Start MongoDB & Redis (Docker)
 docker compose up -d mongodb redis

# 2️⃣  Install dependencies
 cd backend && npm ci && cd ..\frontend && npm ci

# 3️⃣  Launch services (two terminals)
 # Backend
 cd backend && npm run dev   # → http://localhost:5000
 # Frontend (in another terminal)
 cd ..\frontend && npm run dev   # → http://localhost:5173
```

## Demo credentials
| Email | Password | Role |
|-------|----------|------|
| admin@cybershield.io | Admin123! | **ADMIN** |
| analyst@cybershield.io | Analyst123! | **SECURITY_ANALYST** |
| viewer@cybershield.io | Viewer123! | **VIEWER** |

## Build & test
```powershell
# Backend TypeScript compile
cd backend
npm run build

# Backend tests
npm test

# Frontend production build
cd ..\frontend
npm run build
```
""
$readmePath = Join-Path $destRoot "README.md"
$readme | Set-Content $readmePath -Encoding UTF8
Write-Host "  • README.md created" -ForegroundColor Green

Write-Host "\n=== Setup script completed! ===" -ForegroundColor Cyan
"
