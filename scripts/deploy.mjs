import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. In-memory credentials validation (NEVER stored in files or logs)
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!RENDER_API_KEY || !VERCEL_TOKEN) {
  console.error('❌ Error: RENDER_API_KEY and VERCEL_TOKEN must be set in process environment.');
  process.exit(1);
}

// 2. Load MongoDB Atlas connection string from backend/.env or process.env
let MONGODB_URI = process.env.MONGODB_URI;
const backendEnvPath = path.join(rootDir, 'backend', '.env');
if (!MONGODB_URI && fs.existsSync(backendEnvPath)) {
  const bEnv = fs.readFileSync(backendEnvPath, 'utf8');
  const mUri = bEnv.match(/^MONGODB_URI=["']?([^"'\r\n]+)["']?/m);
  if (mUri) MONGODB_URI = mUri[1];
}

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in backend/.env or process.env.');
  process.exit(1);
}

if (!MONGODB_URI.includes('/cybershield')) {
  MONGODB_URI = MONGODB_URI.replace(/\.net(\/|$)/, '.net/cybershield?retryWrites=true&w=majority');
}

// 3. Generate a brand-new cryptographic 64-byte (128 hex chars) JWT secret for production
// Old or previously logged secrets are never reused
const NEW_JWT_SECRET = crypto.randomBytes(64).toString('hex');

// Render API helper
async function renderRequest(endpoint, options = {}) {
  const url = `https://api.render.com/v1${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${RENDER_API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Render API [${res.status} ${res.statusText}]: ${JSON.stringify(data)}`);
  }
  return data;
}

// Get Vercel project production domain before Render deployment
function getVercelProductionOrigin() {
  console.log('🔍 Resolving Vercel production frontend origin...');
  try {
    const listJson = execSync('npx vercel project ls --json', {
      env: { ...process.env, VERCEL_TOKEN },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const parsed = JSON.parse(listJson);
    const projects = Array.isArray(parsed) ? parsed : (parsed.projects || []);
    const existing = projects.find(p => p.name === 'cybershield-frontend');
    if (existing && existing.targets?.production?.url) {
      const origin = `https://${existing.targets.production.url}`;
      console.log(`✅ Found existing Vercel project production domain: ${origin}`);
      return origin;
    }
  } catch (err) {
    // If project ls fails or JSON format differs, use canonical Vercel alias
  }
  const defaultOrigin = 'https://cybershield-frontend.vercel.app';
  console.log(`✅ Using canonical Vercel production domain: ${defaultOrigin}`);
  return defaultOrigin;
}

async function getRenderOwnerId() {
  console.log('🔍 Fetching Render account owner info...');
  const owners = await renderRequest('/owners');
  if (!owners || owners.length === 0) {
    throw new Error('No Render owners or workspaces found for this API key.');
  }
  const owner = owners[0].owner;
  console.log(`✅ Using Render Owner: ${owner.name || owner.email} (${owner.id})`);
  return owner.id;
}

async function getOrCreateAndUpdateRenderService(ownerId, frontendOrigin) {
  console.log('🔍 Checking existing Render services...');
  const services = await renderRequest(`/services?limit=100`);
  const existing = services.find(s => s.service && s.service.name === 'cybershield-backend');

  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '5000' },
    { key: 'MONGODB_URI', value: MONGODB_URI },
    { key: 'JWT_SECRET', value: NEW_JWT_SECRET },
    { key: 'JWT_EXPIRES_IN', value: '24h' },
    { key: 'CORS_ORIGIN', value: frontendOrigin } // Strict production origin (NO localhost)
  ];

  if (existing) {
    const serviceId = existing.service.id;
    console.log(`✅ Found existing Render service: ${serviceId}`);
    console.log('🔄 Updating Render environment variables with fresh JWT secret and production CORS...');
    await renderRequest(`/services/${serviceId}/env-vars`, {
      method: 'PUT',
      body: JSON.stringify(envVars)
    });

    console.log('🚀 Triggering Render deploy with updated production configuration...');
    const deploy = await renderRequest(`/services/${serviceId}/deploys`, {
      method: 'POST',
      body: JSON.stringify({ clearCache: 'do_not_clear' })
    });
    console.log(`✅ Deployment initiated: ${deploy.id}`);
    return existing.service;
  }

  console.log('🚀 Creating new Render Web Service: cybershield-backend...');
  const payload = {
    type: 'web',
    name: 'cybershield-backend',
    ownerId: ownerId,
    repo: 'https://github.com/shylajat003-dot/Cybershield-intelligence-platform',
    branch: 'main',
    rootDir: 'backend',
    autoDeploy: 'yes',
    serviceDetails: {
      env: 'node',
      plan: 'free',
      region: 'oregon',
      envSpecificDetails: {
        buildCommand: 'npm install --include=dev && npm run build',
        startCommand: 'npm run start'
      },
      healthCheckPath: '/health',
      envVars
    }
  };

  const created = await renderRequest('/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  console.log(`✅ Render Service created: ${created.id}`);
  return created;
}

async function waitForRenderDeploy(serviceId) {
  console.log('⏳ Waiting for Render backend service to build and deploy...');
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000; // 10 minutes max timeout

  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 15000));
    const deploys = await renderRequest(`/services/${serviceId}/deploys?limit=5`);
    if (deploys && deploys.length > 0) {
      const latest = deploys[0].deploy;
      console.log(`   Deploy status: ${latest.status}...`);
      if (latest.status === 'live') {
        console.log('✅ Render deploy reached LIVE status successfully!');
        break;
      }
      if (['build_failed', 'update_failed', 'canceled', 'deactivated'].includes(latest.status)) {
        throw new Error(`❌ Fatal: Render deployment halted with status: "${latest.status}". Check Render build logs.`);
      }
    }
  }

  const s = await renderRequest(`/services/${serviceId}`);
  const backendUrl = s.serviceDetails?.url;
  if (!backendUrl) {
    throw new Error('❌ Fatal: Render did not return a valid public URL.');
  }
  return backendUrl.replace(/\/$/, '');
}

async function verifyBackendHealth(backendUrl) {
  console.log(`🔍 Checking backend health endpoint at ${backendUrl}/health...`);
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch(`${backendUrl}/health`);
      if (res.status === 200) {
        const body = await res.json();
        if (body && body.status === 'ok') {
          console.log('✅ Backend health check passed: HTTP 200 OK (service is operational).');
          return true;
        }
      }
    } catch {
      console.log(`   Waiting for backend to respond (${i + 1}/12)...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error(`❌ Fatal: Backend at ${backendUrl}/health failed to respond with HTTP 200 OK.`);
}

async function deployFrontendToVercel(backendUrl) {
  console.log('🚀 Deploying Frontend to Vercel...');

  // Configure frontend vercel.json rewrites pointing /api/* -> Render backend
  const frontendVercelJsonPath = path.join(rootDir, 'frontend', 'vercel.json');
  const frontendConfig = {
    rewrites: [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: '/(.*)',
        destination: '/index.html'
      }
    ]
  };
  fs.writeFileSync(frontendVercelJsonPath, JSON.stringify(frontendConfig, null, 2), 'utf8');

  // Configure root vercel.json as well for root-linked deployments
  const rootVercelJsonPath = path.join(rootDir, 'vercel.json');
  const rootConfig = {
    buildCommand: 'cd frontend && npm install && npm run build',
    outputDirectory: 'frontend/dist',
    rewrites: [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: '/(.*)',
        destination: '/index.html'
      }
    ]
  };
  fs.writeFileSync(rootVercelJsonPath, JSON.stringify(rootConfig, null, 2), 'utf8');

  console.log(`✅ Configured Vercel rewrites: /api/* -> ${backendUrl}/api/*`);

  // Deploy from frontend/ using environment variables (NEVER passed as CLI flags)
  const frontendDir = path.join(rootDir, 'frontend');
  console.log('   Executing Vercel CLI deploy from frontend/ directory...');

  const deployOutput = execSync('npx vercel deploy --prod --yes', {
    cwd: frontendDir,
    env: {
      ...process.env,
      VERCEL_TOKEN: VERCEL_TOKEN,
      VITE_API_URL: `${backendUrl}/api`
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const lines = deployOutput.trim().split('\n');
  const urlLine = lines.reverse().find(l => l.trim().startsWith('https://'));
  if (!urlLine) {
    throw new Error('❌ Fatal: Could not parse Vercel deployment URL from CLI output.');
  }
  const frontendUrl = urlLine.trim();
  console.log(`✅ Vercel Production Deployment: ${frontendUrl}`);
  return frontendUrl;
}

async function syncCorsOriginIfChanged(serviceId, expectedOrigin, actualOrigin) {
  if (expectedOrigin !== actualOrigin) {
    console.log(`🔄 Updating Render CORS_ORIGIN to exact assigned Vercel URL: ${actualOrigin}`);
    const envVars = [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '5000' },
      { key: 'MONGODB_URI', value: MONGODB_URI },
      { key: 'JWT_SECRET', value: NEW_JWT_SECRET },
      { key: 'JWT_EXPIRES_IN', value: '24h' },
      { key: 'CORS_ORIGIN', value: actualOrigin }
    ];
    await renderRequest(`/services/${serviceId}/env-vars`, {
      method: 'PUT',
      body: JSON.stringify(envVars)
    });
    console.log('✅ Render CORS_ORIGIN synchronized with exact Vercel URL.');
  }
}

// Full Non-Destructive End-to-End Verification
async function verifyCompleteApplication(frontendUrl, backendUrl) {
  console.log('\n🧪 Running Non-Destructive End-to-End Application Verification...');

  // 1. Verify Frontend loads with HTTP 200 and root element
  console.log(`1. Testing Frontend HTTP response (${frontendUrl})...`);
  const feRes = await fetch(frontendUrl);
  if (feRes.status !== 200) {
    throw new Error(`❌ Frontend verification failed: Expected HTTP 200, got ${feRes.status}`);
  }
  const feHtml = await feRes.text();
  if (!feHtml.includes('id="root"')) {
    throw new Error('❌ Frontend verification failed: Missing root DOM mount point.');
  }
  console.log('   ✅ Frontend returns HTTP 200 OK with valid React DOM mount point.');

  // 2. Test Admin Login against backend AuthController
  console.log(`2. Testing Admin Login (${backendUrl}/api/auth/login)...`);
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: 'Admin123!' })
  });
  if (loginRes.status !== 200) {
    throw new Error(`❌ Login failed: Expected HTTP 200, got ${loginRes.status}`);
  }
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.data?.token || loginData.data.token.length < 20) {
    throw new Error(`❌ Login failed: Invalid token payload in response.`);
  }
  if (loginData.data.user?.role !== 'ADMIN') {
    throw new Error(`❌ Login failed: Expected ADMIN role, got ${loginData.data.user?.role}`);
  }
  const token = loginData.data.token;
  console.log(`   ✅ Login succeeded with HTTP 200: Authenticated as ${loginData.data.user.name} (${loginData.data.user.role}).`);

  // 3. Test Auth Guard rejection (Security verification)
  console.log('3. Testing Authentication Guard rejection (invalid credentials)...');
  const badLoginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: 'WrongPassword123!' })
  });
  if (badLoginRes.status !== 401) {
    throw new Error(`❌ Auth guard failed: Expected HTTP 401 for bad password, got ${badLoginRes.status}`);
  }
  const badLoginData = await badLoginRes.json();
  if (badLoginData.success !== false) {
    throw new Error('❌ Auth guard failed: Expected success=false on invalid login.');
  }
  console.log('   ✅ Auth guard successfully rejected invalid credentials with HTTP 401.');

  // 4. Test Registration Schema Validation (Non-destructive: Zero database writes)
  console.log('4. Testing Registration Schema Validation (non-destructive probe)...');
  const regValidationRes = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid-email-probe' }) // missing required fields
  });
  if (regValidationRes.status !== 400) {
    throw new Error(`❌ Registration validation failed: Expected HTTP 400, got ${regValidationRes.status}`);
  }
  const regValidationData = await regValidationRes.json();
  if (regValidationData.success !== false) {
    throw new Error('❌ Registration validation failed: Expected success=false on invalid payload.');
  }
  console.log('   ✅ Registration validation verified with HTTP 400 (database untouched).');

  // 5. Test Threats Intelligence API (ThreatController.getAll)
  console.log('5. Testing Threats Intelligence API (/api/threats)...');
  const threatsRes = await fetch(`${backendUrl}/api/threats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (threatsRes.status !== 200) {
    throw new Error(`❌ Threats API failed: Expected HTTP 200, got ${threatsRes.status}`);
  }
  const threatsData = await threatsRes.json();
  if (!threatsData.success || !Array.isArray(threatsData.data?.threats) || threatsData.data.threats.length === 0) {
    throw new Error('❌ Threats API failed: Invalid or empty threats data structure.');
  }
  console.log(`   ✅ Fetched ${threatsData.data.threats.length} threat indicators from Atlas (total: ${threatsData.data.pagination.total}).`);

  // 6. Test Dashboard Summary API (DashboardController.getSummary)
  console.log('6. Testing Dashboard Summary API (/api/dashboard/summary)...');
  const summaryRes = await fetch(`${backendUrl}/api/dashboard/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (summaryRes.status !== 200) {
    throw new Error(`❌ Dashboard summary failed: Expected HTTP 200, got ${summaryRes.status}`);
  }
  const summaryData = await summaryRes.json();
  if (!summaryData.success || typeof summaryData.data?.totalThreats !== 'number') {
    throw new Error('❌ Dashboard summary failed: Missing numeric metrics.');
  }
  console.log(`   ✅ Dashboard metrics verified: ${summaryData.data.totalThreats} total threats, ${summaryData.data.activeIncidents} active incidents.`);

  // 7. Test Security Alerts API (AlertController.getAll)
  console.log('7. Testing Security Alerts API (/api/alerts)...');
  const alertsRes = await fetch(`${backendUrl}/api/alerts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (alertsRes.status !== 200) {
    throw new Error(`❌ Alerts API failed: Expected HTTP 200, got ${alertsRes.status}`);
  }
  const alertsData = await alertsRes.json();
  if (!alertsData.success || !Array.isArray(alertsData.data?.alerts)) {
    throw new Error('❌ Alerts API failed: Invalid alerts data payload.');
  }
  console.log(`   ✅ Alerts API verified: ${alertsData.data.alerts.length} security alerts retrieved (total: ${alertsData.data.pagination.total}).`);

  console.log('\n🎉 ALL PRODUCTION INTEGRATION TESTS PASSED 100%!');
}

async function main() {
  try {
    // 1. Resolve Vercel production origin
    const plannedFrontendOrigin = getVercelProductionOrigin();

    // 2. Provision or update Render backend service
    const ownerId = await getRenderOwnerId();
    const service = await getOrCreateAndUpdateRenderService(ownerId, plannedFrontendOrigin);

    // 3. Wait for Render backend deployment to complete and verify LIVE status
    const backendUrl = await waitForRenderDeploy(service.id);
    await verifyBackendHealth(backendUrl);

    // 4. Deploy frontend to Vercel pointing to the LIVE backend
    const actualFrontendUrl = await deployFrontendToVercel(backendUrl);

    // 5. Synchronize CORS origin if actual domain differs from planned
    await syncCorsOriginIfChanged(service.id, plannedFrontendOrigin, actualFrontendUrl);

    // 6. Run comprehensive non-destructive verification
    await verifyCompleteApplication(actualFrontendUrl, backendUrl);

    console.log('\n======================================================');
    console.log('🏆 CYBERSHIELD INTELLIGENCE PLATFORM FULLY OPERATIONAL!');
    console.log(`🌐 Public Frontend URL: ${actualFrontendUrl}`);
    console.log(`⚙️  Public Backend URL:  ${backendUrl}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Deployment process halted:', error.message);
    process.exit(1);
  }
}

main();
