export type Role = 'ADMIN' | 'SECURITY_ANALYST' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: Role;
  created_at?: Date;
  updated_at?: Date;
}

export type IndicatorType = 'IP' | 'DOMAIN' | 'URL' | 'HASH' | 'EMAIL' | 'FILE' | 'CERTIFICATE';

export type ThreatCategory =
  | 'Malware'
  | 'Phishing'
  | 'Botnet'
  | 'Ransomware'
  | 'Credential Theft'
  | 'Command & Control'
  | 'Data Exfiltration'
  | 'Brute Force'
  | 'Suspicious Activity'
  | 'Other';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ThreatStatus = 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface Threat {
  id: string;
  indicator: string;
  indicator_type: IndicatorType;
  category: ThreatCategory;
  severity: Severity;
  confidence: number; // 0 - 100
  risk_score: number; // 0 - 100
  source_id?: string;
  source_name?: string;
  description?: string;
  first_seen: Date | string;
  last_seen: Date | string;
  status: ThreatStatus;
  tags?: string[];
  mitre_tactic?: string;
  mitre_technique?: string;
  recurrence_count?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
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
  last_seen?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
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
  related_threat_id?: string;
  threat_indicator?: string;
  detection_source?: string;
  resolution_notes?: string;
  timeline?: TimelineEntry[];
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type VulnerabilityStatus = 'OPEN' | 'IN_PROGRESS' | 'PATCHED' | 'ACCEPTED_RISK';

export interface Vulnerability {
  id: string;
  cve_id: string;
  title: string;
  description?: string;
  severity: Severity;
  cvss_score: number; // 0.0 - 10.0
  affected_asset_id?: string;
  asset_name?: string;
  status: VulnerabilityStatus;
  remediation?: string;
  due_date?: Date | string;
  detection_date?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
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
  related_asset_id?: string;
  status: AlertStatus;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type SourceType = 'Internal' | 'External Feed' | 'Security Tool' | 'Manual' | 'API';
export type SourceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface ThreatSource {
  id: string;
  name: string;
  type: SourceType;
  description?: string;
  reliability_score: number; // 0 - 100
  status: SourceStatus;
  indicator_count: number;
  last_updated?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at?: Date | string;
}

export interface RiskScoreBreakdown {
  score: number;
  severityScore: number;
  confidenceContribution: number;
  sourceReliabilityContribution: number;
  recurrenceContribution: number;
  riskLevel: Severity;
  explanation: string;
}

export interface CorrelationResult {
  threat: Threat;
  relatedIncidents: Incident[];
  relatedAlerts: Alert[];
  relatedVulnerabilities: Vulnerability[];
  relatedAssets: Asset[];
  mitreInfo?: {
    tactic?: string;
    technique?: string;
  };
}
