import bcrypt from 'bcryptjs';
import connectDB from './db';
import { User, ThreatSource, Asset, Threat, Incident, Vulnerability, Alert, AuditLog } from '../models';
import { IThreat } from '../models/Threat';
import { RiskScoringService } from '../services/riskScoringService';

export async function seedDatabase() {
  console.log('🌱 Seeding CyberShield demo dataset into MongoDB...');

  await connectDB();

  // Clear existing collections safely
  await Promise.all([
    User.deleteMany({}),
    ThreatSource.deleteMany({}),
    Asset.deleteMany({}),
    Threat.deleteMany({}),
    Incident.deleteMany({}),
    Vulnerability.deleteMany({}),
    Alert.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  // 1. Insert Users
  const adminPass = await bcrypt.hash('Admin123!', 10);
  const analystPass = await bcrypt.hash('Analyst123!', 10);
  const viewerPass = await bcrypt.hash('Viewer123!', 10);

  const [adminUser, analystUser, viewerUser] = await User.create([
    { name: 'SOC Lead Admin', email: 'admin@cybershield.io', password_hash: adminPass, role: 'ADMIN' },
    { name: 'Sarah Connor (Analyst)', email: 'analyst@cybershield.io', password_hash: analystPass, role: 'SECURITY_ANALYST' },
    { name: 'Alex Mercer (Observer)', email: 'viewer@cybershield.io', password_hash: viewerPass, role: 'VIEWER' }
  ]);

  // 2. Insert Threat Sources
  const [sourceHoneypot, sourceGlobal, sourceEDR, sourceDarkweb] = await ThreatSource.create([
    { name: 'Internal Honeypot Sensor Network', type: 'Internal', description: 'Automated internal honeypots deployed in DMZ and Corp LAN', reliability_score: 95, status: 'ACTIVE', indicator_count: 42 },
    { name: 'Global Threat Exchange Feed', type: 'External Feed', description: 'Commercial CTI feed providing real-time IOC telemetry', reliability_score: 88, status: 'ACTIVE', indicator_count: 128 },
    { name: 'CrowdSentinel EDR Telemetry', type: 'Security Tool', description: 'Endpoint detection and response sensor network', reliability_score: 92, status: 'ACTIVE', indicator_count: 64 },
    { name: 'DarkWeb Intelligence Scanner', type: 'API', description: 'Scrapes dark web marketplaces for compromised assets and credentials', reliability_score: 78, status: 'ACTIVE', indicator_count: 19 }
  ]);

  // 3. Insert Monitored Assets
  const [assetDb, assetGateway, assetAuth, assetPayment, assetVpn, assetWorkstation, assetNas, assetK8s, assetPortal, assetHrDb] = await Asset.create([
    { name: 'Prod-DB-Primary', ip_address: '10.0.1.5', hostname: 'db-primary.internal', asset_type: 'Database', environment: 'Production', owner: 'Database Team', status: 'ONLINE', criticality: 'CRITICAL' },
    { name: 'Core-Gateway-Router', ip_address: '10.0.0.1', hostname: 'gw01.network.internal', asset_type: 'Network Device', environment: 'Production', owner: 'NetOps', status: 'ONLINE', criticality: 'CRITICAL' },
    { name: 'Auth-Service-Node-01', ip_address: '10.0.2.10', hostname: 'auth01.prod.internal', asset_type: 'Server', environment: 'Production', owner: 'IAM Team', status: 'ONLINE', criticality: 'HIGH' },
    { name: 'Payment-Gateway-Server', ip_address: '10.0.2.20', hostname: 'pay.prod.internal', asset_type: 'Server', environment: 'Production', owner: 'FinTech Ops', status: 'DEGRADED', criticality: 'CRITICAL' },
    { name: 'Corporate-VPN-Appliance', ip_address: '10.0.0.50', hostname: 'vpn.corp.internal', asset_type: 'Network Device', environment: 'Production', owner: 'SecOps', status: 'ONLINE', criticality: 'HIGH' },
    { name: 'Analyst-Workstation-WS04', ip_address: '10.0.10.4', hostname: 'ws04.corp.local', asset_type: 'Workstation', environment: 'Corporate', owner: 'SOC Analyst', status: 'ONLINE', criticality: 'MEDIUM' },
    { name: 'Finance-Share-NAS', ip_address: '10.0.3.15', hostname: 'nas-fin.corp.internal', asset_type: 'Server', environment: 'Corporate', owner: 'Finance IT', status: 'ONLINE', criticality: 'HIGH' },
    { name: 'Cloud-Kubernetes-Master', ip_address: '10.0.5.1', hostname: 'k8s-master.cloud', asset_type: 'Cloud Resource', environment: 'Production', owner: 'DevOps', status: 'ONLINE', criticality: 'CRITICAL' },
    { name: 'Customer-Portal-App', ip_address: '10.0.4.12', hostname: 'web-app.prod.internal', asset_type: 'Application', environment: 'Production', owner: 'Web Team', status: 'ONLINE', criticality: 'HIGH' },
    { name: 'HR-Database-Secondary', ip_address: '10.0.1.12', hostname: 'db-hr.internal', asset_type: 'Database', environment: 'Production', owner: 'HR Systems', status: 'ONLINE', criticality: 'MEDIUM' }
  ]);

  // 4. Insert Threats
  const threatRawData = [
    {
      indicator: '198.51.100.45', indicator_type: 'IP', category: 'Command & Control', severity: 'CRITICAL', confidence: 95,
      source_id: sourceHoneypot._id, description: 'Active C2 node communicating via encrypted HTTPS beaconing.',
      mitre_tactic: 'Command and Control', mitre_technique: 'T1071 - Application Layer Protocol', tags: ['C2', 'Beaconing', 'Active']
    },
    {
      indicator: 'malicious-update-server.net', indicator_type: 'DOMAIN', category: 'Malware', severity: 'CRITICAL', confidence: 90,
      source_id: sourceGlobal._id, description: 'Domain hosting Cobalt Strike malware payload stage 2.',
      mitre_tactic: 'Execution', mitre_technique: 'T1204 - User Execution', tags: ['CobaltStrike', 'Stage2', 'Payload']
    },
    {
      indicator: 'http://phishing-portal-login.xyz/auth', indicator_type: 'URL', category: 'Phishing', severity: 'HIGH', confidence: 85,
      source_id: sourceDarkweb._id, description: 'Spoofed OAuth login page harvesting SSO credentials.',
      mitre_tactic: 'Credential Access', mitre_technique: 'T1566 - Phishing', tags: ['CredentialHarvest', 'OAuth', 'SSO']
    },
    {
      indicator: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', indicator_type: 'HASH', category: 'Ransomware', severity: 'CRITICAL', confidence: 98,
      source_id: sourceEDR._id, description: 'SHA256 signature for LockBit 3.0 encryptor binary.',
      mitre_tactic: 'Impact', mitre_technique: 'T1486 - Data Encrypted for Impact', tags: ['LockBit', 'Ransomware', 'Critical']
    },
    {
      indicator: 'spoofed-ceo-urgent@executive-mail.org', indicator_type: 'EMAIL', category: 'Phishing', severity: 'MEDIUM', confidence: 70,
      source_id: sourceGlobal._id, description: 'Sender address associated with CEO fraud spear-phishing.',
      mitre_tactic: 'Initial Access', mitre_technique: 'T1566.001 - Spearphishing Attachment', tags: ['BEC', 'Phishing']
    },
    {
      indicator: 'payload_dropper_v2.exe', indicator_type: 'FILE', category: 'Malware', severity: 'HIGH', confidence: 88,
      source_id: sourceEDR._id, description: 'Obfuscated PowerShell dropper masquerading as PDF viewer update.',
      mitre_tactic: 'Defense Evasion', mitre_technique: 'T1027 - Obfuscated Files or Information', tags: ['Dropper', 'PowerShell']
    },
    {
      indicator: 'cert-fake-trust-auth.com', indicator_type: 'CERTIFICATE', category: 'Suspicious Activity', severity: 'MEDIUM', confidence: 65,
      source_id: sourceHoneypot._id, description: 'Self-signed TLS certificate used on rogue internal endpoints.',
      mitre_tactic: 'Defense Evasion', mitre_technique: 'T1553 - Subvert Trust Controls', tags: ['TLSCert', 'Rogue']
    },
    {
      indicator: '185.220.101.5', indicator_type: 'IP', category: 'Botnet', severity: 'HIGH', confidence: 92,
      source_id: sourceGlobal._id, description: 'Known Tor exit node participating in automated credential stuffing.',
      mitre_tactic: 'Credential Access', mitre_technique: 'T1110 - Brute Force', tags: ['Tor', 'Botnet', 'BruteForce']
    },
    {
      indicator: 'cobaltstrike-c2.darknet-node.info', indicator_type: 'DOMAIN', category: 'Command & Control', severity: 'CRITICAL', confidence: 96,
      source_id: sourceGlobal._id, description: 'Primary DNS name for APT29 command & control infra.',
      mitre_tactic: 'Command and Control', mitre_technique: 'T1095 - Non-Application Layer Protocol', tags: ['APT29', 'C2', 'Critical']
    },
    {
      indicator: '203.0.113.195', indicator_type: 'IP', category: 'Brute Force', severity: 'MEDIUM', confidence: 75,
      source_id: sourceHoneypot._id, description: 'Repetitive SSH brute force attempts against DMZ servers.',
      mitre_tactic: 'Credential Access', mitre_technique: 'T1110.001 - Password Guessing', tags: ['SSH', 'BruteForce']
    },
    {
      indicator: 'exfil-storage-bucket.s3.amazonaws-fake.cloud', indicator_type: 'DOMAIN', category: 'Data Exfiltration', severity: 'HIGH', confidence: 85,
      source_id: sourceEDR._id, description: 'Unauthorized cloud bucket endpoint receiving internal database dumps.',
      mitre_tactic: 'Exfiltration', mitre_technique: 'T1567 - Exfiltration to Cloud Storage', tags: ['Exfiltration', 'Cloud']
    },
    {
      indicator: 'steal-credentials.js', indicator_type: 'FILE', category: 'Credential Theft', severity: 'HIGH', confidence: 80,
      source_id: sourceEDR._id, description: 'Browser extension injector designed to capture web banking credentials.',
      mitre_tactic: 'Credential Access', mitre_technique: 'T1056 - Input Capture', tags: ['JSInjector', 'Stealer']
    },
    {
      indicator: '192.0.2.78', indicator_type: 'IP', category: 'Suspicious Activity', severity: 'LOW', confidence: 45,
      source_id: sourceHoneypot._id, description: 'Low-frequency port scanner targeting port 443.',
      mitre_tactic: 'Reconnaissance', mitre_technique: 'T1595 - Active Scanning', tags: ['PortScan', 'LowRisk']
    },
    {
      indicator: 'vpn-exploit-scanner.biz', indicator_type: 'DOMAIN', category: 'Malware', severity: 'HIGH', confidence: 88,
      source_id: sourceDarkweb._id, description: 'Scanning domain targeting zero-day vulnerabilities in enterprise VPNs.',
      mitre_tactic: 'Initial Access', mitre_technique: 'T1190 - Exploit Public-Facing Application', tags: ['Exploit', 'VPN']
    },
    {
      indicator: 'crypto-miner-daemon.sh', indicator_type: 'FILE', category: 'Malware', severity: 'MEDIUM', confidence: 78,
      source_id: sourceEDR._id, description: 'Unauthorized XMRig cryptomining script executed in container host.',
      mitre_tactic: 'Impact', mitre_technique: 'T1496 - Resource Hijacking', tags: ['Cryptominer', 'XMRig']
    }
  ];

  const threatsDocs: IThreat[] = [];
  for (const t of threatRawData) {
    const riskCalc = RiskScoringService.calculateRiskScore({
      severity: t.severity as any,
      confidence: t.confidence,
      sourceReliability: 90,
      recurrenceCount: 1
    });

    const doc = await Threat.create({
      ...(t as any),
      risk_score: riskCalc.score
    });
    threatsDocs.push(doc);
  }

  // 5. Insert Incidents
  await Incident.create([
    {
      title: 'Ransomware Containment on Payment Gateway',
      description: 'LockBit 3.0 activity identified on Payment Server. Host isolated from network.',
      severity: 'CRITICAL', status: 'INVESTIGATING', analyst_id: analystUser._id, affected_asset_id: assetPayment._id,
      related_threat_id: threatsDocs[3]._id, detection_source: 'EDR Sensor Alert',
      resolution_notes: 'Host network interface disabled; memory dump extracted for forensic analysis.',
      timeline: [
        { timestamp: '2026-08-28T14:10:00Z', author: 'EDR Alert System', action: 'Threat Detected', notes: 'Hash match for LockBit binary' },
        { timestamp: '2026-08-28T14:15:00Z', author: 'Sarah Connor', action: 'Analyst Assigned', notes: 'Initiated containment protocol' },
        { timestamp: '2026-08-28T14:30:00Z', author: 'Sarah Connor', action: 'Host Isolated', notes: 'Network interface disabled via API' }
      ]
    },
    {
      title: 'Credential Harvest Attack targeting Executive Emails',
      description: 'Spear phishing campaign attempting to compromise C-suite credentials.',
      severity: 'HIGH', status: 'OPEN', analyst_id: analystUser._id, affected_asset_id: assetAuth._id,
      related_threat_id: threatsDocs[2]._id, detection_source: 'Email Gateway Guard',
      timeline: [{ timestamp: '2026-08-28T12:00:00Z', author: 'Mail Security', action: 'Incident Created', notes: 'Phishing emails flagged' }]
    },
    {
      title: 'Unauthorized Data Transfer from Finance NAS',
      description: 'Anomalous outbound SMB traffic detected heading towards external IP 198.51.100.45.',
      severity: 'HIGH', status: 'CONTAINED', analyst_id: adminUser._id, affected_asset_id: assetNas._id,
      related_threat_id: threatsDocs[0]._id, detection_source: 'Honeypot IDS', resolution_notes: 'Firewall rule updated to block outbound IP 198.51.100.45.',
      timeline: [
        { timestamp: '2026-08-28T10:00:00Z', author: 'Honeypot IDS', action: 'Anomaly Detected' },
        { timestamp: '2026-08-28T11:05:00Z', author: 'SOC Lead Admin', action: 'Firewall Blocked' }
      ]
    },
    {
      title: 'Brute Force Burst against Corporate VPN',
      description: 'Over 5,000 failed authentication requests within 10 minutes.',
      severity: 'MEDIUM', status: 'RESOLVED', analyst_id: analystUser._id, affected_asset_id: assetVpn._id,
      related_threat_id: threatsDocs[7]._id, detection_source: 'VPN Auth Log', resolution_notes: 'Attacking IP blocklisted automatically.',
      timeline: [
        { timestamp: '2026-08-28T08:00:00Z', author: 'VPN Appliance', action: 'Burst Detected' },
        { timestamp: '2026-08-28T08:10:00Z', author: 'AutoResponder', action: 'IP Blocked' }
      ]
    },
    {
      title: 'Command & Control Connection Detected on Workstation WS04',
      description: 'Outbound SSL beaconing to cobaltstrike-c2.darknet-node.info.',
      severity: 'CRITICAL', status: 'INVESTIGATING', analyst_id: analystUser._id, affected_asset_id: assetWorkstation._id,
      related_threat_id: threatsDocs[8]._id, detection_source: 'Network Packet Inspection',
      timeline: [{ timestamp: '2026-08-28T15:20:00Z', author: 'Suricata IDS', action: 'C2 Beacon Flagged' }]
    },
    {
      title: 'Log4j Attempted Exploitation on Customer Portal',
      description: 'RCE exploit string identified in User-Agent header.',
      severity: 'HIGH', status: 'CONTAINED', analyst_id: analystUser._id, affected_asset_id: assetPortal._id,
      related_threat_id: threatsDocs[0]._id, detection_source: 'WAF Guard', resolution_notes: 'WAF rule activated.',
      timeline: [{ timestamp: '2026-08-27T18:00:00Z', author: 'WAF', action: 'Exploit Blocked' }]
    },
    {
      title: 'Suspicious PowerShell Payload Execution on Node-01',
      description: 'Obfuscated command line payload executed by service account.',
      severity: 'MEDIUM', status: 'OPEN', analyst_id: analystUser._id, affected_asset_id: assetAuth._id,
      related_threat_id: threatsDocs[5]._id, detection_source: 'EDR Alert',
      timeline: [{ timestamp: '2026-08-28T16:00:00Z', author: 'EDR', action: 'Suspicious Process' }]
    },
    {
      title: 'SQL Injection Reconnaissance on HR Database',
      description: 'Automated SQLi scanner signatures detected in web traffic.',
      severity: 'LOW', status: 'RESOLVED', analyst_id: adminUser._id, affected_asset_id: assetHrDb._id,
      related_threat_id: threatsDocs[9]._id, detection_source: 'WAF Guard', resolution_notes: 'Scanner IP blocklisted.',
      timeline: [{ timestamp: '2026-08-26T09:00:00Z', author: 'WAF', action: 'Scanning Blocked' }]
    }
  ]);

  // 6. Insert Vulnerabilities
  await Vulnerability.create([
    { cve_id: 'CVE-2024-3094', title: 'xz Utils Backdoor Remote Code Execution', description: 'Malicious code in xz utils allowing SSH authentication bypass.', severity: 'CRITICAL', cvss_score: 10.0, affected_asset_id: assetPayment._id, status: 'IN_PROGRESS', remediation: 'Downgrade or patch xz package to 5.6.2.', due_date: new Date(Date.now() + 2 * 86400000) },
    { cve_id: 'CVE-2023-34362', title: 'MOVEit Transfer SQL Injection RCE', description: 'Unauthenticated SQL injection leading to remote code execution.', severity: 'CRITICAL', cvss_score: 9.8, affected_asset_id: assetGateway._id, status: 'OPEN', remediation: 'Apply MOVEit vendor patch immediately.', due_date: new Date(Date.now() + 1 * 86400000) },
    { cve_id: 'CVE-2021-44228', title: 'Log4j Remote Code Execution (Log4Shell)', description: 'JNDI injection flaw in Apache Log4j 2.x allowing unauthenticated RCE.', severity: 'CRITICAL', cvss_score: 10.0, affected_asset_id: assetK8s._id, status: 'PATCHED', remediation: 'Upgraded log4j dependency to 2.17.1.' },
    { cve_id: 'CVE-2023-23397', title: 'Microsoft Outlook Privilege Escalation', description: 'NetNTLMv2 hash leak triggered by crafted calendar items.', severity: 'HIGH', cvss_score: 8.8, affected_asset_id: assetWorkstation._id, status: 'IN_PROGRESS', remediation: 'Deploy KB5023151 system update.', due_date: new Date(Date.now() + 5 * 86400000) },
    { cve_id: 'CVE-2024-21626', title: 'runc Container Breakout Flaw', description: 'File descriptor leak allowing host filesystem escape from container.', severity: 'HIGH', cvss_score: 8.6, affected_asset_id: assetK8s._id, status: 'OPEN', remediation: 'Upgrade runc to version 1.1.12.', due_date: new Date(Date.now() + 3 * 86400000) },
    { cve_id: 'CVE-2023-22515', title: 'Confluence Data Center Authentication Bypass', description: 'Unauthenticated attacker can create admin accounts.', severity: 'CRITICAL', cvss_score: 9.8, affected_asset_id: assetPortal._id, status: 'OPEN', remediation: 'Restrict network access & upgrade Confluence.', due_date: new Date(Date.now() + 1 * 86400000) },
    { cve_id: 'CVE-2023-38606', title: 'Apple WebKit Memory Corruption', description: 'Processing malicious web content leads to arbitrary code execution.', severity: 'MEDIUM', cvss_score: 6.5, affected_asset_id: assetWorkstation._id, status: 'ACCEPTED_RISK', remediation: 'Mitigated with browser sandbox enforcement.', due_date: new Date(Date.now() + 30 * 86400000) },
    { cve_id: 'CVE-2024-21762', title: 'Fortinet FortiOS Out-of-Bounds Write', description: 'RCE via specially crafted HTTP requests.', severity: 'CRITICAL', cvss_score: 9.8, affected_asset_id: assetVpn._id, status: 'IN_PROGRESS', remediation: 'Apply FortiOS firmware patch.', due_date: new Date(Date.now() + 2 * 86400000) },
    { cve_id: 'CVE-2023-4966', title: 'Citrix Bleed Sensitive Information Disclosure', description: 'Buffer overflow allowing session token theft.', severity: 'HIGH', cvss_score: 7.5, affected_asset_id: assetGateway._id, status: 'PATCHED', remediation: 'Updated Citrix ADC appliance.' },
    { cve_id: 'CVE-2022-22965', title: 'Spring4Shell Remote Code Execution', description: 'RCE vulnerability in Spring Framework data binding.', severity: 'MEDIUM', cvss_score: 6.8, affected_asset_id: assetPortal._id, status: 'PATCHED', remediation: 'Upgraded Spring Framework to 5.3.18.' }
  ]);

  // 7. Insert Alerts
  await Alert.create([
    { title: 'Critical C2 Communication Blocked', description: 'Outbound HTTP beaconing detected towards malicious IP 198.51.100.45.', severity: 'CRITICAL', alert_type: 'C2 Beaconing', source: 'Firewall Egress Guard', related_threat_id: threatsDocs[0]._id, related_asset_id: assetVpn._id, status: 'NEW' },
    { title: 'Multiple Failed Login Attempts from Suspicious IP', description: '100+ failed SSH logins from IP 203.0.113.195 in 2 minutes.', severity: 'HIGH', alert_type: 'Brute Force', source: 'SSH Guard', related_threat_id: threatsDocs[9]._id, related_asset_id: assetWorkstation._id, status: 'ACKNOWLEDGED' },
    { title: 'Unpatched Critical CVE Detected on Core Gateway', description: 'CVE-2023-34362 detected during vulnerability scan.', severity: 'CRITICAL', alert_type: 'Vulnerability Flag', source: 'Qualys Scanner', related_asset_id: assetGateway._id, status: 'NEW' },
    { title: 'Ransomware LockBit 3.0 Hash Match', description: 'Process signature matching LockBit ransomware detected on Payment Gateway.', severity: 'CRITICAL', alert_type: 'Ransomware Match', source: 'CrowdSentinel EDR', related_threat_id: threatsDocs[3]._id, related_asset_id: assetPayment._id, status: 'INVESTIGATING' },
    { title: 'Phishing Email Campaign Received', description: 'Spear-phishing emails targeting 15 employees with credential harvester link.', severity: 'HIGH', alert_type: 'Phishing', source: 'Email Gateway Guard', related_threat_id: threatsDocs[2]._id, status: 'ACKNOWLEDGED' },
    { title: 'Anomalous Outbound Data Volume', description: '5GB data transfer detected to suspicious cloud endpoint.', severity: 'HIGH', alert_type: 'Data Exfiltration', source: 'NetFlow Analyzer', related_threat_id: threatsDocs[0]._id, related_asset_id: assetNas._id, status: 'NEW' },
    { title: 'Privilege Escalation Attempt on K8s Node', description: 'Container breakout attempt via runc exploit (CVE-2024-21626).', severity: 'CRITICAL', alert_type: 'Exploit Attempt', source: 'Falco Container Guard', related_asset_id: assetK8s._id, status: 'INVESTIGATING' },
    { title: 'Malicious Domain Resolution Blocked', description: 'DNS request for cobaltstrike-c2.darknet-node.info intercepted by Sinkhole.', severity: 'HIGH', alert_type: 'DNS Sinkhole', source: 'Internal DNS Resolver', related_threat_id: threatsDocs[8]._id, related_asset_id: assetWorkstation._id, status: 'RESOLVED' },
    { title: 'Self-Signed Certificate on Production Server', description: 'Unapproved TLS cert detected on Auth Service node.', severity: 'MEDIUM', alert_type: 'Policy Violation', source: 'TLS Scanner', related_asset_id: assetAuth._id, status: 'NEW' },
    { title: 'Cryptominer Process Execution Blocked', description: 'XMRig binary execution intercepted by host EDR.', severity: 'MEDIUM', alert_type: 'Malware Execution', source: 'CrowdSentinel EDR', related_threat_id: threatsDocs[14]._id, related_asset_id: assetK8s._id, status: 'RESOLVED' }
  ]);

  // 8. Insert Initial Audit Logs
  await AuditLog.create([
    { user_id: adminUser._id, user_email: 'admin@cybershield.io', user_role: 'ADMIN', action: 'SYSTEM_INITIALIZATION', entity: 'SYSTEM', entity_id: '0', details: { message: 'CyberShield Intelligence Platform initialized and seeded with MERN dataset.' } },
    { user_id: analystUser._id, user_email: 'analyst@cybershield.io', user_role: 'SECURITY_ANALYST', action: 'INCIDENT_UPDATED', entity: 'INCIDENT', entity_id: '1', details: { status: 'INVESTIGATING', notes: 'Host isolated via EDR API' } }
  ]);

  console.log('✅ CyberShield MongoDB Database seeded successfully with 15+ threats, 10+ assets, 8+ incidents, 10+ vulnerabilities, 10+ alerts!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding script failed:', err);
      process.exit(1);
    });
}
