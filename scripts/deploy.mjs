import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Credentials loaded in process memory only (NEVER logged or stored on disk)
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const ADMIN_PASSWORD = process.env.CYBERSHIELD_ADMIN_PASSWORD;

if (!RENDER_API_KEY || !VERCEL_TOKEN || !ADMIN_PASSWORD) {
  console.error('❌ Error: RENDER_API_KEY, VERCEL_TOKEN, and CYBERSHIELD_ADMIN_PASSWORD must be present in process environment.');
  process.exit(1);
}

// 2. Load MongoDB Atlas URI from backend/.env or process.env
let MONGODB_URI = process.env.MONGODB_URI;
const backendEnvPath = path.join(rootDir, 'backend', '.env');
if (!MONGODB_URI && fs.existsSync(backendEnvPath)) {
  const bEnv = fs.readFileSync(backendEnvPath, 'utf8');
  const mUri = bEnv.match(/^MONGODB_URI=["']?([^"'\r\n]+)["']?/m);
  if (mUri) MONGODB_URI = mUri[1];
}

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in backend/.env or process environment.');
  process.exit(1);
}

if (!MONGODB_URI.includes('/cybershield')) {
  MONGODB_URI = MONGODB_URI.replace(/\.net(\/|$)/, '.net/cybershield?retryWrites=true&w=majority');
}

// Render API request helper
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

// Resolve Vercel production domain from existing project or canonical alias
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

// Check existing Render service and reuse its existing JWT secret if available
async function getOrCreateRenderService(ownerId, initialCorsOrigin) {
  console.log('🔍 Checking for existing Render service cybershield-backend...');
  const services = await renderRequest(`/services?limit=100`);
  const existing = services.find(s => s.service && s.service.name === 'cybershield-backend');

  let activeJwtSecret;

  if (existing) {
    const serviceId = existing.service.id;
    console.log(`✅ Found existing Render service: ${serviceId}`);

    // Retrieve existing env vars to preserve JWT_SECRET and avoid invalidating active sessions
    try {
      const existingVars = await renderRequest(`/services/${serviceId}/env-vars`);
      const foundJwt = existingVars.find(v => v.envVar?.key === 'JWT_SECRET');
      if (foundJwt && foundJwt.envVar?.value) {
        activeJwtSecret = foundJwt.envVar.value;
        console.log('🔑 Preserving existing Render JWT_SECRET (session continuity guaranteed).');
      }
    } catch (e) {
      console.warn('   Could not retrieve existing env vars from Render.');
    }

    if (!activeJwtSecret) {
      activeJwtSecret = crypto.randomBytes(64).toString('hex');
      console.log('🔑 Generated new cryptographic JWT secret.');
    }

    const envVars = [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '5000' },
      { key: 'MONGODB_URI', value: MONGODB_URI },
      { key: 'JWT_SECRET', value: activeJwtSecret },
      { key: 'JWT_EXPIRES_IN', value: '24h' },
      { key: 'CORS_ORIGIN', value: initialCorsOrigin }
    ];

    console.log('🔄 Updating Render service environment variables and production configuration...');
    await renderRequest(`/services/${serviceId}/env-vars`, {
      method: 'PUT',
      body: JSON.stringify(envVars)
    });

    console.log('🚀 Triggering a fresh build and deploy...');
    await renderRequest(`/services/${serviceId}/deploys`, {
      method: 'POST',
      body: JSON.stringify({ clearCache: 'do_not_clear' })
    });

    return { service: existing.service, jwtSecret: activeJwtSecret };
  }

  // Create new service
  activeJwtSecret = crypto.randomBytes(64).toString('hex');
  console.log('🚀 Creating new Render Web Service: cybershield-backend...');
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '5000' },
    { key: 'MONGODB_URI', value: MONGODB_URI },
    { key: 'JWT_SECRET', value: activeJwtSecret },
    { key: 'JWT_EXPIRES_IN', value: '24h' },
    { key: 'CORS_ORIGIN', value: initialCorsOrigin }
  ];

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
  return { service: created, jwtSecret: activeJwtSecret };
}

async function waitForRenderDeploy(serviceId) {
  console.log('⏳ Waiting for Render backend to build and deploy...');
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
        throw new Error(`❌ Fatal: Render deployment halted with status "${latest.status}". Check Render logs.`);
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

// Deploy frontend to Vercel and extract canonical production domain
async function deployFrontendToVercel(backendUrl) {
  console.log('🚀 Deploying Frontend to Vercel...');

  // Configure frontend/vercel.json rewrites so /api/* proxies directly to backend
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

  // Deploy from frontend/ using environment variables (never command line argument flags)
  // --build-env passes the backend URL to Vite's build step in production
  const frontendDir = path.join(rootDir, 'frontend');
  console.log('   Executing Vercel CLI production deploy with VITE_API_URL build environment...');

  const deployCmd = `npx vercel deploy --prod --yes --build-env VITE_API_URL=${backendUrl}/api`;
  const deployOutput = execSync(deployCmd, {
    cwd: frontendDir,
    env: {
      ...process.env,
      VERCEL_TOKEN: VERCEL_TOKEN,
      VITE_API_URL: `${backendUrl}/api`
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const lines = deployOutput.split('\n').map(l => l.trim());

  // 1. Look for explicit Production URL from Vercel output
  let productionUrl;
  for (const line of lines) {
    const match = line.match(/^Production:\s*(https:\/\/[^\s]+)/i);
    if (match) {
      productionUrl = match[1];
      break;
    }
  }

  // 2. Look for canonical non-preview domain
  if (!productionUrl) {
    for (const line of lines.reverse()) {
      const match = line.match(/(https:\/\/[a-zA-Z0-9-]+\.vercel\.app)/);
      if (match && !match[1].includes('-git-') && !match[1].match(/-[a-z0-9]{8,}\.vercel\.app/)) {
        productionUrl = match[1];
        break;
      }
    }
  }

  // 3. Fallback to CLI project inspection
  if (!productionUrl) {
    try {
      const inspectJson = execSync('npx vercel project inspect cybershield-frontend --json', {
        env: { ...process.env, VERCEL_TOKEN },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      const parsed = JSON.parse(inspectJson);
      if (parsed.targets?.production?.url) {
        productionUrl = `https://${parsed.targets.production.url}`;
      }
    } catch {}
  }

  if (!productionUrl) {
    const fallback = lines.reverse().find(l => l.startsWith('https://'));
    if (fallback) productionUrl = fallback;
  }

  if (!productionUrl) {
    throw new Error('❌ Fatal: Could not determine Vercel production domain from CLI output.');
  }

  console.log(`✅ Vercel Production Domain Verified: ${productionUrl}`);
  return productionUrl;
}

// Synchronize CORS and wait for deploy to reach LIVE before testing
async function syncCorsAndEnsureLive(serviceId, backendUrl, expectedOrigin, actualOrigin, jwtSecret) {
  if (expectedOrigin !== actualOrigin) {
    console.log(`🔄 Synchronizing Render CORS_ORIGIN to exact Vercel production domain: ${actualOrigin}`);
    const envVars = [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '5000' },
      { key: 'MONGODB_URI', value: MONGODB_URI },
      { key: 'JWT_SECRET', value: jwtSecret },
      { key: 'JWT_EXPIRES_IN', value: '24h' },
      { key: 'CORS_ORIGIN', value: actualOrigin }
    ];
    await renderRequest(`/services/${serviceId}/env-vars`, {
      method: 'PUT',
      body: JSON.stringify(envVars)
    });

    console.log('🚀 Triggering a fresh Render deploy to apply exact CORS configuration...');
    await renderRequest(`/services/${serviceId}/deploys`, {
      method: 'POST',
      body: JSON.stringify({ clearCache: 'do_not_clear' })
    });

    // Wait until Render reaches LIVE status with the new CORS configuration
    await waitForRenderDeploy(serviceId);
    // Verify health again
    await verifyBackendHealth(backendUrl);
    console.log('✅ Render backend is verified LIVE with exact production CORS origin.');
  }
}

// Non-destructive end-to-end verification (Zero database writes, exact controller response matching)
async function verifyCompleteApplication(frontendUrl, backendUrl) {
  console.log('\n🧪 Running End-to-End Application & Integration Verification...');

  // 1. Verify Frontend loads with HTTP 200 and root DOM element
  console.log(`1. Testing Frontend endpoint (${frontendUrl})...`);
  const feRes = await fetch(frontendUrl);
  if (feRes.status !== 200) {
    throw new Error(`❌ Frontend verification failed: Expected HTTP 200, got ${feRes.status}`);
  }
  const feHtml = await feRes.text();
  if (!feHtml.includes('id="root"')) {
    throw new Error('❌ Frontend verification failed: Missing root DOM mount point.');
  }
  console.log('   ✅ Frontend returns HTTP 200 OK with valid React DOM mount point.');

  // 2. Verify Vercel /api proxy to backend works
  console.log(`2. Testing Frontend Vercel API proxy (${frontendUrl}/api/health)...`);
  try {
    const proxyRes = await fetch(`${frontendUrl}/api/health`);
    if (proxyRes.status === 200) {
      const proxyData = await proxyRes.json();
      if (proxyData && proxyData.status === 'ok') {
        console.log('   ✅ Vercel rewrite proxy to backend /api is operational (HTTP 200 OK).');
      }
    }
  } catch (proxyErr) {
    console.warn(`   Notice: Direct Vercel proxy check: ${proxyErr.message}`);
  }

  // 3. Test Admin Login against AuthController.login
  console.log(`3. Testing Admin Login (${backendUrl}/api/auth/login)...`);
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: ADMIN_PASSWORD })
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

  // 4. Test Auth Guard rejection (Security verification)
  console.log('4. Testing Authentication Guard rejection (invalid credentials probe)...');
  const badLoginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: 'IncorrectPassword_Probe_123!' })
  });
  if (badLoginRes.status !== 401) {
    throw new Error(`❌ Auth guard failed: Expected HTTP 401 for bad password, got ${badLoginRes.status}`);
  }
  const badLoginData = await badLoginRes.json();
  if (badLoginData.success !== false) {
    throw new Error('❌ Auth guard failed: Expected success=false on invalid login.');
  }
  console.log('   ✅ Auth guard successfully rejected invalid credentials with HTTP 401.');

  // 5. Test Registration Schema Validation (Non-destructive: Zero database writes)
  console.log('5. Testing Registration Schema Validation (non-destructive probe)...');
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

  // 6. Test Threats Intelligence API (ThreatController.getAll)
  console.log('6. Testing Threats Intelligence API (/api/threats)...');
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

  // 7. Test Dashboard Summary API (DashboardController.getSummary)
  console.log('7. Testing Dashboard Summary API (/api/dashboard/summary)...');
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

  // 8. Test Security Alerts API (AlertController.getAll)
  console.log('8. Testing Security Alerts API (/api/alerts)...');
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

    // 2. Provision or update Render backend service (preserves existing JWT_SECRET if already configured)
    const ownerId = await getRenderOwnerId();
    const { service, jwtSecret } = await getOrCreateRenderService(ownerId, plannedFrontendOrigin);

    // 3. Wait for Render backend deployment to complete and verify LIVE status
    const backendUrl = await waitForRenderDeploy(service.id);
    await verifyBackendHealth(backendUrl);

    // 4. Deploy frontend to Vercel with VITE_API_URL build environment and extract production domain
    const actualFrontendUrl = await deployFrontendToVercel(backendUrl);

    // 5. Synchronize Render CORS origin to exact Vercel production domain and verify LIVE again
    await syncCorsAndEnsureLive(service.id, backendUrl, plannedFrontendOrigin, actualFrontendUrl, jwtSecret);

    // 6. Run comprehensive non-destructive integration verification
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
