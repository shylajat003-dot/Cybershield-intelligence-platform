export type Role = 'ADMIN' | 'SECURITY_ANALYST' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IndicatorType = 'IP' | 'DOMAIN' | 'URL' | 'HASH' | 'EMAIL' | 'FILE' | 'CERTIFICATE';
export type ThreatStatus = 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
export type ThreatCategory =
  | 'Malware' | 'Phishing' | 'Botnet' | 'Ransomware' | 'Credential Theft'
  | 'Command & Control' | 'Data Exfiltration' | 'Brute Force' | 'Suspicious Activity' | 'Other';

export interface Threat {
  id: string;
  indicator: string;
  indicator_type: IndicatorType;
  category: ThreatCategory;
  severity: Severity;
  confidence: number;
  risk_score: number;
  source_id?: string;
  source_name?: string;
  description?: string;
  first_seen: string;
  last_seen: string;
  status: ThreatStatus;
  tags?: string[];
  mitre_tactic?: string;
  mitre_technique?: string;
  recurrence_count?: number;
  created_at?: string;
}

export interface RiskBreakdown {
  score: number;
  severityScore: number;
  confidenceContribution: number;
  sourceReliabilityContribution: number;
  recurrenceContribution: number;
  riskLevel: Severity;
  explanation: string;
}

export type AssetType = 'Server' | 'Workstation' | 'Laptop' | 'Database' | 'Network Device' | 'Cloud Resource' | 'Application';
export type AssetStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN';

export interface Asset {
  id: string;
  name: string;
  ip_address: string;
  hostname?: string;
  asset_type: AssetType;
  environment: string;
  owner?: string;
  status: AssetStatus;
  criticality: Severity;
  last_seen?: string;
  created_at?: string;
  threat_count?: number;
  vuln_count?: number;
  risk_score?: number;
}

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';

export interface TimelineEntry {
  timestamp: string;
  author: string;
  action: string;
  notes?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  analyst_id?: string;
  analyst_name?: string;
  affected_asset_id?: string;
  asset_name?: string;
  asset_ip?: string;
  related_threat_id?: string;
  threat_indicator?: string;
  threat_severity?: Severity;
  detection_source?: string;
  resolution_notes?: string;
  timeline?: TimelineEntry[];
  created_at?: string;
  updated_at?: string;
}

export type VulnerabilityStatus = 'OPEN' | 'IN_PROGRESS' | 'PATCHED' | 'ACCEPTED_RISK';

export interface Vulnerability {
  id: string;
  cve_id: string;
  title: string;
  description?: string;
  severity: Severity;
  cvss_score: number;
  affected_asset_id?: string;
  asset_name?: string;
  asset_ip?: string;
  status: VulnerabilityStatus;
  remediation?: string;
  due_date?: string;
  detection_date?: string;
  created_at?: string;
}

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';

export interface Alert {
  id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  alert_type: string;
  source?: string;
  related_threat_id?: string;
  threat_indicator?: string;
  related_asset_id?: string;
  asset_name?: string;
  status: AlertStatus;
  created_at?: string;
}

export type SourceType = 'Internal' | 'External Feed' | 'Security Tool' | 'Manual' | 'API';
export type SourceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface ThreatSource {
  id: string;
  name: string;
  type: SourceType;
  description?: string;
  reliability_score: number;
  status: SourceStatus;
  indicator_count: number;
  last_updated?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at?: string;
}

export interface DashboardSummary {
  totalThreats: number;
  criticalThreats: number;
  activeIncidents: number;
  openVulnerabilities: number;
  monitoredAssets: number;
  activeAlerts: number;
  recentCriticalThreats: Threat[];
  activeIncidentList: Incident[];
  latestAlerts: Alert[];
  vulnerableAssets: (Asset & { vuln_count: number; incident_count: number })[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  cached?: boolean;
}

export interface SearchResults {
  query: string;
  totalResults: number;
  results: {
    threats: Partial<Threat>[];
    incidents: Partial<Incident>[];
    vulnerabilities: Partial<Vulnerability>[];
    assets: Partial<Asset>[];
    alerts: Partial<Alert>[];
  };
}
