import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Credentials loaded in process memory only (never written to disk or logged)
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const ADMIN_PASSWORD = process.env.CYBERSHIELD_ADMIN_PASSWORD;

if (!RENDER_API_KEY || !VERCEL_TOKEN || !ADMIN_PASSWORD) {
  console.error('❌ Error: RENDER_API_KEY, VERCEL_TOKEN, and CYBERSHIELD_ADMIN_PASSWORD must be present in process environment.');
  process.exit(1);
}

// 2. Parse and validate MongoDB Atlas URI using the standard URL class
function parseAndValidateMongoUri() {
  let rawUri = process.env.MONGODB_URI;
  const backendEnvPath = path.join(rootDir, 'backend', '.env');
  if (!rawUri && fs.existsSync(backendEnvPath)) {
    const bEnv = fs.readFileSync(backendEnvPath, 'utf8');
    const m = bEnv.match(/^MONGODB_URI=["']?([^"'\r\n]+)["']?/m);
    if (m) rawUri = m[1];
  }

  if (!rawUri) {
    throw new Error('❌ Fatal: MONGODB_URI not found in backend/.env or process environment.');
  }

  let parsed;
  try {
    parsed = new URL(rawUri);
  } catch (err) {
    throw new Error(`❌ Fatal: MONGODB_URI is not a valid URL format: ${err.message}`);
  }

  if (parsed.protocol !== 'mongodb:' && parsed.protocol !== 'mongodb+srv:') {
    throw new Error(`❌ Fatal: MONGODB_URI protocol must be "mongodb:" or "mongodb+srv:", got "${parsed.protocol}".`);
  }

  const dbName = parsed.pathname.replace(/^\//, '');
  if (dbName && dbName !== 'cybershield') {
    throw new Error(`❌ Fatal: MONGODB_URI specifies database "${dbName}", but "cybershield" is strictly required. Silently connecting to another database is rejected.`);
  }

  if (!dbName) {
    parsed.pathname = '/cybershield';
  }

  if (!parsed.search) {
    parsed.search = '?retryWrites=true&w=majority';
  }

  return parsed.toString();
}

const MONGODB_URI = parseAndValidateMongoUri();

// 3. Render API request helper
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

// 4. Update individual Render environment variable safely (preserves all other keys)
async function updateRenderSingleEnvVar(serviceId, key, value) {
  await renderRequest(`/services/${serviceId}/env-vars/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  });
}

// 5. Track specific deployment until LIVE or throw explicit error
async function waitForRenderDeploy(serviceId, targetDeployId) {
  console.log(`⏳ Tracking deployment ${targetDeployId} until LIVE status...`);
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000; // 10 minutes timeout
  let isLive = false;

  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 15000));
    try {
      const deploy = await renderRequest(`/services/${serviceId}/deploys/${targetDeployId}`);
      if (deploy) {
        console.log(`   Deploy ${targetDeployId} status: ${deploy.status}...`);
        if (deploy.status === 'live') {
          console.log(`✅ Deployment ${targetDeployId} reached LIVE status!`);
          isLive = true;
          break;
        }
        if (['build_failed', 'update_failed', 'canceled', 'deactivated'].includes(deploy.status)) {
          throw new Error(`❌ Fatal: Deployment "${targetDeployId}" failed with status: "${deploy.status}". Check Render build logs.`);
        }
      }
    } catch (err) {
      if (err.message.includes('Fatal:')) throw err;
      console.warn(`   Notice checking deploy status: ${err.message}`);
    }
  }

  if (!isLive) {
    throw new Error(`❌ Fatal: Deployment "${targetDeployId}" did not reach LIVE status within 10 minutes timeout.`);
  }

  const s = await renderRequest(`/services/${serviceId}`);
  const backendUrl = s.serviceDetails?.url;
  if (!backendUrl) {
    throw new Error('❌ Fatal: Render did not return a valid public service URL.');
  }
  return backendUrl.replace(/\/$/, '');
}

// 6. Verify backend health endpoint (GET /health as defined in app.ts)
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

async function getRenderOwnerId() {
  console.log('🔍 Fetching Render account owner info...');
  const owners = await renderRequest('/owners');
  if (!owners || owners.length === 0) {
    throw new Error('❌ Fatal: No Render owners or workspaces found for this API key.');
  }
  const owner = owners[0].owner;
  console.log(`✅ Using Render Owner: ${owner.name || owner.email} (${owner.id})`);
  return owner.id;
}

// 7. Get or create Render service with safe JWT_SECRET preservation
async function getOrCreateRenderService(ownerId) {
  console.log('🔍 Checking existing Render services...');
  const services = await renderRequest(`/services?limit=100`);
  const existing = services.find(s => s.service && s.service.name === 'cybershield-backend');

  if (existing) {
    const serviceId = existing.service.id;
    console.log(`✅ Found existing Render service: ${serviceId}`);

    // Fetch existing env vars to preserve JWT_SECRET
    let existingVars;
    try {
      existingVars = await renderRequest(`/services/${serviceId}/env-vars`);
    } catch (err) {
      throw new Error(`❌ Fatal: Could not retrieve existing Render environment variables: ${err.message}. Halting to prevent session invalidation.`);
    }

    const foundJwt = existingVars.find(v => v.envVar?.key === 'JWT_SECRET');
    if (!foundJwt || !foundJwt.envVar?.value) {
      throw new Error('❌ Fatal: Existing Render service detected, but existing JWT_SECRET could not be retrieved. Halting deployment to avoid session invalidation. Please verify your Render service configuration.');
    }
    const jwtSecret = foundJwt.envVar.value;
    console.log('🔑 Verified existing JWT_SECRET on Render (session continuity preserved).');

    // Update only required environment variables individually (preserves all other keys)
    await updateRenderSingleEnvVar(serviceId, 'NODE_ENV', 'production');
    await updateRenderSingleEnvVar(serviceId, 'PORT', '5000');
    await updateRenderSingleEnvVar(serviceId, 'MONGODB_URI', MONGODB_URI);
    await updateRenderSingleEnvVar(serviceId, 'JWT_EXPIRES_IN', '24h');

    // Trigger deploy
    console.log('🚀 Triggering Render build and deployment for existing service...');
    const deploy = await renderRequest(`/services/${serviceId}/deploys`, {
      method: 'POST',
      body: JSON.stringify({ clearCache: 'do_not_clear' })
    });

    return { service: existing.service, deployId: deploy.id, jwtSecret };
  }

  // Create brand new service
  console.log('🚀 Creating new Render Web Service: cybershield-backend...');
  const newJwtSecret = crypto.randomBytes(64).toString('hex');
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '5000' },
    { key: 'MONGODB_URI', value: MONGODB_URI },
    { key: 'JWT_SECRET', value: newJwtSecret },
    { key: 'JWT_EXPIRES_IN', value: '24h' },
    { key: 'CORS_ORIGIN', value: 'https://cybershield-frontend.vercel.app' }
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

  // Fetch initial deploy ID created on service creation
  const deploys = await renderRequest(`/services/${created.id}/deploys?limit=1`);
  const initialDeployId = deploys && deploys[0] ? deploys[0].deploy.id : null;

  return { service: created, deployId: initialDeployId, jwtSecret: newJwtSecret };
}

// 8. Deploy frontend to Vercel (Direct API strategy: VITE_API_URL + pure SPA rewrite)
async function deployFrontendToVercel(backendUrl) {
  console.log('🚀 Deploying Frontend to Vercel (Direct Render API strategy via VITE_API_URL)...');

  const frontendDir = path.join(rootDir, 'frontend');

  // Ensure vercel.json contains strictly the SPA rewrite (no proxy rewrites)
  const vercelSpaConfig = {
    rewrites: [
      {
        source: '/(.*)',
        destination: '/index.html'
      }
    ]
  };
  fs.writeFileSync(path.join(frontendDir, 'vercel.json'), JSON.stringify(vercelSpaConfig, null, 2), 'utf8');

  console.log('   Executing Vercel CLI production deploy with --build-env VITE_API_URL...');
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

  // Parse verified production URL from CLI output
  let productionUrl;
  for (const line of lines) {
    const match = line.match(/^Production:\s*(https:\/\/[^\s]+)/i);
    if (match) {
      productionUrl = match[1];
      break;
    }
  }

  // Inspect Vercel project targets if not directly found
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

  // Safe fallback to canonical non-preview domain from output
  if (!productionUrl) {
    for (const line of lines.reverse()) {
      const match = line.match(/(https:\/\/[a-zA-Z0-9-]+\.vercel\.app)/);
      if (match && !match[1].includes('-git-') && !match[1].match(/-[a-z0-9]{8,}\.vercel\.app/)) {
        productionUrl = match[1];
        break;
      }
    }
  }

  if (!productionUrl) {
    throw new Error('❌ Fatal: Could not determine verified Vercel production domain from CLI output. Halting safely.');
  }

  console.log(`✅ Verified Vercel Production Domain: ${productionUrl}`);
  return productionUrl;
}

// 9. Synchronize CORS origin and wait for the new deployment to reach LIVE
async function syncCorsAndDeploy(serviceId, backendUrl, productionOrigin) {
  console.log(`🔐 Updating Render CORS_ORIGIN key to exact Vercel production origin: ${productionOrigin}...`);
  await updateRenderSingleEnvVar(serviceId, 'CORS_ORIGIN', productionOrigin);

  console.log('🚀 Triggering Render deploy with updated production CORS origin...');
  const deploy = await renderRequest(`/services/${serviceId}/deploys`, {
    method: 'POST',
    body: JSON.stringify({ clearCache: 'do_not_clear' })
  });

  // Wait specifically for this deploy to reach LIVE
  await waitForRenderDeploy(serviceId, deploy.id);
  // Verify backend health after deployment
  await verifyBackendHealth(backendUrl);
  console.log('✅ Render backend deployment is LIVE with verified production CORS origin.');
}

// 10. Comprehensive non-destructive integration verification matching backend controllers
async function verifyCompleteApplication(frontendUrl, backendUrl) {
  console.log('\n🧪 Running End-to-End Application & Integration Verification...');

  // 1. Verify Frontend loads with HTTP 200 and root DOM container
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

  // 2. Test Admin Login against AuthController.login
  console.log(`2. Testing Admin Login (${backendUrl}/api/auth/login)...`);
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
    throw new Error('❌ Login failed: Invalid data.token payload structure.');
  }
  if (loginData.data.user?.role !== 'ADMIN') {
    throw new Error(`❌ Login failed: Expected ADMIN role, got ${loginData.data.user?.role}`);
  }
  const token = loginData.data.token;
  console.log(`   ✅ Login succeeded with HTTP 200: Authenticated as ${loginData.data.user.name} (${loginData.data.user.role}).`);

  // 3. Test Auth Guard rejection (Security verification)
  console.log('3. Testing Authentication Guard rejection (invalid credentials probe)...');
  const badLoginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: 'InvalidPassword_Probe_123!' })
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
    throw new Error('❌ Threats API failed: Invalid or empty data.threats array.');
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
    throw new Error('❌ Dashboard summary failed: Missing data.totalThreats numeric metric.');
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
    throw new Error('❌ Alerts API failed: Invalid data.alerts payload.');
  }
  console.log(`   ✅ Alerts API verified: ${alertsData.data.alerts.length} security alerts retrieved (total: ${alertsData.data.pagination.total}).`);

  console.log('\n🎉 ALL PRODUCTION INTEGRATION TESTS PASSED 100%!');
}

async function main() {
  try {
    // Step 1: Provision or update Render service with JWT preservation
    const ownerId = await getRenderOwnerId();
    const { service, deployId } = await getOrCreateRenderService(ownerId);

    // Step 2: Track initial deployment until LIVE and verify root /health
    let backendUrl;
    if (deployId) {
      backendUrl = await waitForRenderDeploy(service.id, deployId);
    } else {
      const s = await renderRequest(`/services/${service.id}`);
      backendUrl = s.serviceDetails?.url?.replace(/\/$/, '');
    }
    await verifyBackendHealth(backendUrl);

    // Step 3: Deploy frontend to Vercel (direct API strategy with VITE_API_URL baked in)
    const frontendUrl = await deployFrontendToVercel(backendUrl);

    // Step 4: Synchronize Render CORS to exact Vercel production domain and wait for deployment to reach LIVE
    await syncCorsAndDeploy(service.id, backendUrl, frontendUrl);

    // Step 5: Execute non-destructive integration verification
    await verifyCompleteApplication(frontendUrl, backendUrl);

    console.log('\n======================================================');
    console.log('🏆 CYBERSHIELD INTELLIGENCE PLATFORM FULLY OPERATIONAL!');
    console.log(`🌐 Public Frontend URL: ${frontendUrl}`);
    console.log(`⚙️  Public Backend URL:  ${backendUrl}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Deployment process halted:', error.message);
    process.exit(1);
  }
}

main();
