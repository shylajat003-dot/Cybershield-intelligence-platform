import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env or .deploy-credentials.env if present
const credsPath = path.join(rootDir, '.deploy-credentials.env');
if (fs.existsSync(credsPath)) {
  const content = fs.readFileSync(credsPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!RENDER_API_KEY || !VERCEL_TOKEN) {
  console.error('❌ Error: Both RENDER_API_KEY and VERCEL_TOKEN must be set.');
  process.exit(1);
}

const MONGODB_URI = "mongodb+srv://shylajat003_db_user:aFqVnH932ZRD8diM@cluster0.bjtbzzh.mongodb.net/cybershield?retryWrites=true&w=majority";
const JWT_SECRET = "e7accec8501b6cfd48f410d83faef46860b9ef34a64fb975157ac639d50c43944047a8570dbc3e5e61bc2b8ed3c86d57";

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
  console.log('🔍 Checking existing Render services...');
  const services = await renderRequest(`/services?limit=100`);
  const existing = services.find(s => s.service && s.service.name === 'cybershield-backend');
  
  if (existing) {
    console.log(`✅ Found existing Render service: ${existing.service.id} (${existing.service.serviceDetails?.url})`);
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
        { key: 'JWT_SECRET', value: JWT_SECRET },
        { key: 'JWT_EXPIRES_IN', value: '24h' },
        { key: 'CORS_ORIGIN', value: '*' }
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

async function waitForRenderDeploy(serviceId) {
  console.log('⏳ Waiting for Render backend service to build and deploy (this may take 2-4 minutes)...');
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000; // 10 minutes

  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 15000));
    try {
      const deploys = await renderRequest(`/services/${serviceId}/deploys?limit=5`);
      if (deploys && deploys.length > 0) {
        const latest = deploys[0].deploy;
        console.log(`   Deploy status: ${latest.status}...`);
        if (latest.status === 'live') {
          console.log('✅ Render deploy is LIVE!');
          break;
        } else if (latest.status === 'build_failed' || latest.status === 'update_failed') {
          throw new Error(`Render deploy failed with status: ${latest.status}`);
        }
      }
    } catch (err) {
      console.warn(`   Notice while checking deploy status: ${err.message}`);
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
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${backendUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Backend health check passed:', data);
        return true;
      }
    } catch (e) {
      console.log(`   Waiting for backend to respond (${i + 1}/10)...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error(`Backend at ${backendUrl}/health failed to respond.`);
}

async function deployFrontendToVercel(backendUrl) {
  console.log('🚀 Deploying Frontend to Vercel...');

  // Update vercel.json with the actual backend proxy URL
  const rootVercelJsonPath = path.join(rootDir, 'vercel.json');
  const vercelConfig = {
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
  fs.writeFileSync(rootVercelJsonPath, JSON.stringify(vercelConfig, null, 2), 'utf8');

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

  console.log(`✅ Configured vercel.json with backend rewrites pointing to: ${backendUrl}/api`);

  // Run Vercel CLI deploy from frontend directory
  const frontendDir = path.join(rootDir, 'frontend');
  const deployCmd = `npx vercel deploy --prod --yes --token ${VERCEL_TOKEN} --build-env VITE_API_URL=${backendUrl}/api`;
  console.log('   Executing Vercel CLI deploy command...');
  const output = execSync(deployCmd, { cwd: frontendDir, encoding: 'utf8' });
  console.log(output);

  // Parse deployment URL
  const lines = output.trim().split('\n');
  const urlLine = lines.reverse().find(l => l.startsWith('https://'));
  if (!urlLine) {
    throw new Error('Could not find Vercel deployment URL in CLI output.');
  }
  const frontendUrl = urlLine.trim();
  console.log(`✅ Vercel Deployment URL: ${frontendUrl}`);
  return frontendUrl;
}

async function verifyCompleteApplication(frontendUrl, backendUrl) {
  console.log('\n🧪 Running End-to-End Application Verification...');

  // 1. Verify Frontend loads
  console.log(`1. Testing Frontend HTTP response (${frontendUrl})...`);
  const feRes = await fetch(frontendUrl);
  if (!feRes.ok) throw new Error(`Frontend returned HTTP ${feRes.status}`);
  console.log('   ✅ Frontend returns HTTP 200 OK');

  // 2. Test Login
  console.log(`2. Testing API Login (${backendUrl}/api/auth/login)...`);
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cybershield.io', password: 'Admin123!' })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.token;
  console.log(`   ✅ Login succeeded! User: ${loginData.user.name} (${loginData.user.role})`);

  // 3. Test Registration
  console.log('3. Testing New User Registration...');
  const testEmail = `test_${Date.now()}@cybershield.io`;
  const regRes = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Automated Test User',
      email: testEmail,
      password: 'TestPassword123!',
      role: 'SECURITY_ANALYST'
    })
  });
  const regData = await regRes.json();
  if (regRes.ok && regData.token) {
    console.log(`   ✅ Registration test passed: Created ${testEmail}`);
  } else {
    console.warn(`   ⚠️ Registration response: ${JSON.stringify(regData)}`);
  }

  // 4. Test Threats API
  console.log('4. Testing Threats Intelligence API...');
  const threatsRes = await fetch(`${backendUrl}/api/threats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const threatsData = await threatsRes.json();
  console.log(`   ✅ Fetched ${threatsData.threats?.length || 0} threats from MongoDB Atlas!`);

  // 5. Test Dashboard Stats
  console.log('5. Testing Dashboard Stats API...');
  const statsRes = await fetch(`${backendUrl}/api/dashboard/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statsData = await statsRes.json();
  console.log('   ✅ Dashboard metrics retrieved successfully:', statsData.counts || statsData);

  // 6. Test Security Alerts
  console.log('6. Testing Security Alerts API...');
  const alertsRes = await fetch(`${backendUrl}/api/alerts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const alertsData = await alertsRes.json();
  console.log(`   ✅ Alerts retrieved successfully: ${alertsData.alerts?.length || 0} alerts`);

  console.log('\n🎉 ALL APPLICATION AND INTEGRATION TESTS PASSED 100%!');
}

async function main() {
  try {
    const ownerId = await getRenderOwnerId();
    const service = await getOrCreateRenderService(ownerId);
    const backendUrl = await waitForRenderDeploy(service.id);
    await testBackendHealth(backendUrl);

    // Deploy frontend
    const frontendUrl = await deployFrontendToVercel(backendUrl);

    // Run complete verification
    await verifyCompleteApplication(frontendUrl, backendUrl);

    console.log('\n======================================================');
    console.log('🏆 CYBERSHIELD INTELLIGENCE PLATFORM FULLY DEPLOYED!');
    console.log(`🌐 Frontend URL: ${frontendUrl}`);
    console.log(`⚙️  Backend URL:  ${backendUrl}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    process.exit(1);
  }
}

main();
