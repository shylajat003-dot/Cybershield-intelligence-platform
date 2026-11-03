import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. In-memory credentials validation (NEVER written to disk or temp files)
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!RENDER_API_KEY || !VERCEL_TOKEN) {
  console.error('❌ Error: Both RENDER_API_KEY and VERCEL_TOKEN must be provided via environment variables.');
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
  console.error('❌ Error: MONGODB_URI not found in backend/.env or environment.');
  process.exit(1);
}

// Ensure database name is in URI
if (!MONGODB_URI.includes('/cybershield')) {
  MONGODB_URI = MONGODB_URI.replace(/\.net(\/|$)/, '.net/cybershield?retryWrites=true&w=majority');
}

// 3. Generate a brand-new high-entropy cryptographic JWT secret (64 bytes / 128 hex chars)
// Never reuses any previously exposed keys
const NEW_JWT_SECRET = crypto.randomBytes(64).toString('hex');

// Render API helper (no secret logging)
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

async function getRenderOwnerId() {
  console.log('🔍 Fetching Render account owner info...');
  const owners = await renderRequest('/owners');
  if (!owners || owners.length === 0) {
    throw new Error('No Render owners/workspaces found for this API key.');
  }
  const owner = owners[0].owner;
  console.log(`✅ Using Render Owner: ${owner.name || owner.email} (${owner.id})`);
  return owner.id;
}

async function getOrCreateRenderService(ownerId) {
  console.log('🔍 Checking for existing Render service cybershield-backend...');
  const services = await renderRequest(`/services?limit=100`);
  const existing = services.find(s => s.service && s.service.name === 'cybershield-backend');
  
  if (existing) {
    console.log(`✅ Found existing Render service: ${existing.service.id}`);
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
      envVars: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'PORT', value: '5000' },
        { key: 'MONGODB_URI', value: MONGODB_URI },
        { key: 'JWT_SECRET', value: NEW_JWT_SECRET },
        { key: 'JWT_EXPIRES_IN', value: '24h' },
        { key: 'CORS_ORIGIN', value: 'http://localhost:5173' } // will be updated with exact Vercel URL
      ]
    }
  };

  const created = await renderRequest('/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  console.log(`✅ Render Service created: ${created.id}`);
  return created;
}

async function updateRenderEnvVars(serviceId, frontendOrigin) {
  console.log(`🔐 Updating Render CORS_ORIGIN to exact frontend origin: ${frontendOrigin}`);
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '5000' },
    { key: 'MONGODB_URI', value: MONGODB_URI },
    { key: 'JWT_SECRET', value: NEW_JWT_SECRET },
    { key: 'JWT_EXPIRES_IN', value: '24h' },
    { key: 'CORS_ORIGIN', value: `${frontendOrigin},http://localhost:5173` }
  ];

  await renderRequest(`/services/${serviceId}/env-vars`, {
    method: 'PUT',
    body: JSON.stringify(envVars)
  });
  console.log('✅ Render environment variables updated with exact CORS origin and new secure JWT secret.');
}

async function waitForRenderDeploy(serviceId) {
  console.log('⏳ Waiting for Render backend to build and deploy...');
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000; // 10 minutes max wait

  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 15000));
    const deploys = await renderRequest(`/services/${serviceId}/deploys?limit=5`);
    if (deploys && deploys.length > 0) {
      const latest = deploys[0].deploy;
      console.log(`   Deploy status: ${latest.status}...`);
      if (latest.status === 'live') {
        console.log('✅ Render deploy reached LIVE status!');
        break;
      }
      if (['build_failed', 'update_failed', 'canceled', 'deactivated'].includes(latest.status)) {
        throw new Error(`❌ Render deployment stopped: Service reached fatal status "${latest.status}".`);
      }
    }
  }

  const s = await renderRequest(`/services/${serviceId}`);
  const backendUrl = s.serviceDetails?.url;
  if (!backendUrl) {
    throw new Error('Render did not return a public service URL.');
  }
  return backendUrl.replace(/\/$/, '');
}

async function testBackendHealth(backendUrl) {
  console.log(`🔍 Verifying backend health at ${backendUrl}/health...`);
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch(`${backendUrl}/health`);
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.status === 'ok') {
          console.log('✅ Backend health check passed with HTTP 200 OK:', data);
          return true;
        }
      }
    } catch (e) {
      console.log(`   Waiting for backend service to respond (${i + 1}/12)...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error(`❌ Fatal: Backend at ${backendUrl}/health failed to respond with HTTP 200 OK.`);
}

async function deployFrontendToVercel(backendUrl) {
  console.log('🚀 Deploying Frontend to Vercel...');

  // Configure vercel.json rewrites so /api/* proxies directly to backend
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

  console.log(`✅ Configured Vercel rewrites pointing /api/* -> ${backendUrl}/api/*`);

  // Execute Vercel deploy using environment variable (NEVER command line argument)
  const frontendDir = path.join(rootDir, 'frontend');
  console.log('   Executing Vercel CLI deploy (credentials passed via process environment)...');
  
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
    throw new Error('❌ Could not find Vercel deployment URL in CLI output.');
  }
  const frontendUrl = urlLine.trim();
  console.log(`✅ Vercel Production Deployment: ${frontendUrl}`);
  return frontendUrl;
}

async function verifyCompleteApplication(frontendUrl, backendUrl) {
  console.log('\n🧪 Running End-to-End Application & Integration Verification...');

  // 1. Verify Frontend HTTP 200 and HTML payload
  console.log(`1. Testing Frontend endpoint (${frontendUrl})...`);
  const feRes = await fetch(frontendUrl);
  if (feRes.status !== 200) {
    throw new Error(`❌ Frontend verification failed: Expected HTTP 200, got ${feRes.status}`);
  }
  const feHtml = await feRes.text();
  if (!feHtml.includes('id="root"')) {
    throw new Error('❌ Frontend verification failed: Missing root DOM mount point.');
  }
  console.log('   ✅ Frontend returns HTTP 200 OK with valid React DOM container.');

  // 2. Test Admin Login with status code and payload assertion
  console.log(`2. Testing API Login (${backendUrl}/api/auth/login)...`);
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: 'Admin123!' })
  });
  if (loginRes.status !== 200) {
    throw new Error(`❌ Login failed: Expected HTTP 200, got ${loginRes.status}`);
  }
  const loginData = await loginRes.json();
  if (!loginData.success || typeof loginData.token !== 'string' || loginData.token.length < 20) {
    throw new Error(`❌ Login failed: Invalid auth token response payload.`);
  }
  const token = loginData.token;
  console.log(`   ✅ Login succeeded with HTTP 200: Authenticated as ${loginData.user.name} (${loginData.user.role}).`);

  // 3. Test Registration & immediate clean up of the verification record
  console.log('3. Testing User Registration & Automatic Account Cleanup...');
  const testEmail = `verify_${Date.now()}@cybershield.io`;
  const regRes = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Verification Probe',
      email: testEmail,
      password: 'VerifyPassword123!',
      role: 'SECURITY_ANALYST'
    })
  });
  if (regRes.status !== 201 && regRes.status !== 200) {
    throw new Error(`❌ Registration failed: Expected HTTP 201/200, got ${regRes.status}`);
  }
  const regData = await regRes.json();
  if (!regData.token) {
    throw new Error('❌ Registration failed: No auth token returned in registration response.');
  }
  console.log(`   ✅ Registration test passed: Temporary account created.`);

  // Clean up ONLY this specific test user account in MongoDB Atlas
  try {
    await mongoose.connect(MONGODB_URI);
    const deleteRes = await mongoose.connection.collection('users').deleteOne({ email: testEmail });
    console.log(`   🧹 Database integrity preserved: Cleaned up temporary test user (${deleteRes.deletedCount} deleted).`);
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.warn(`   ⚠️ Notice during test account cleanup: ${cleanErr.message}`);
  }

  // 4. Test Threats Intelligence API
  console.log('4. Testing Threats Intelligence API (/api/threats)...');
  const threatsRes = await fetch(`${backendUrl}/api/threats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (threatsRes.status !== 200) {
    throw new Error(`❌ Threats API failed: Expected HTTP 200, got ${threatsRes.status}`);
  }
  const threatsData = await threatsRes.json();
  if (!Array.isArray(threatsData.threats) || threatsData.threats.length === 0) {
    throw new Error('❌ Threats API failed: No threat records found in database.');
  }
  console.log(`   ✅ Fetched ${threatsData.threats.length} threat indicators from Atlas.`);

  // 5. Test Dashboard Stats API
  console.log('5. Testing Dashboard Stats API (/api/dashboard/stats)...');
  const statsRes = await fetch(`${backendUrl}/api/dashboard/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (statsRes.status !== 200) {
    throw new Error(`❌ Dashboard stats failed: Expected HTTP 200, got ${statsRes.status}`);
  }
  const statsData = await statsRes.json();
  console.log('   ✅ Dashboard metrics verified successfully.');

  // 6. Test Security Alerts API
  console.log('6. Testing Security Alerts API (/api/alerts)...');
  const alertsRes = await fetch(`${backendUrl}/api/alerts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (alertsRes.status !== 200) {
    throw new Error(`❌ Alerts API failed: Expected HTTP 200, got ${alertsRes.status}`);
  }
  const alertsData = await alertsRes.json();
  if (!Array.isArray(alertsData.alerts)) {
    throw new Error('❌ Alerts API failed: alerts array not returned.');
  }
  console.log(`   ✅ Alerts API verified: ${alertsData.alerts.length} security alerts returned.`);

  console.log('\n🎉 ALL VERIFICATION AND INTEGRATION TESTS PASSED 100%!');
}

async function main() {
  try {
    const ownerId = await getRenderOwnerId();
    const service = await getOrCreateRenderService(ownerId);
    const backendUrl = await waitForRenderDeploy(service.id);
    await testBackendHealth(backendUrl);

    // Deploy frontend to Vercel
    const frontendUrl = await deployFrontendToVercel(backendUrl);

    // Update Render with exact Vercel CORS origin
    await updateRenderEnvVars(service.id, frontendUrl);

    // Run end-to-end verification
    await verifyCompleteApplication(frontendUrl, backendUrl);

    console.log('\n======================================================');
    console.log('🏆 CYBERSHIELD INTELLIGENCE PLATFORM DEPLOYED!');
    console.log(`🌐 Frontend URL: ${frontendUrl}`);
    console.log(`⚙️  Backend URL:  ${backendUrl}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Deployment process stopped:', error.message);
    process.exit(1);
  }
}

main();
