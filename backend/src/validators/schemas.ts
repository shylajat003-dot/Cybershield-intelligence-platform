import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'SECURITY_ANALYST', 'VIEWER']).optional().default('SECURITY_ANALYST'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const threatSchema = z.object({
  body: z.object({
    indicator: z.string().min(1, 'Indicator is required'),
    indicator_type: z.enum(['IP', 'DOMAIN', 'URL', 'HASH', 'EMAIL', 'FILE', 'CERTIFICATE']),
    category: z.enum([
      'Malware',
      'Phishing',
      'Botnet',
      'Ransomware',
      'Credential Theft',
      'Command & Control',
      'Data Exfiltration',
      'Brute Force',
      'Suspicious Activity',
      'Other',
    ]),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    confidence: z.number().min(0).max(100).default(75),
    source_id: z.string().uuid().optional().nullable(),
    description: z.string().optional(),
    status: z.enum(['ACTIVE', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']).optional().default('ACTIVE'),
    tags: z.array(z.string()).optional(),
    mitre_tactic: z.string().optional(),
    mitre_technique: z.string().optional(),
  }),
});

export const incidentSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title is required'),
    description: z.string().min(5, 'Description is required'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    status: z.enum(['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED']).optional().default('OPEN'),
    analyst_id: z.string().uuid().optional().nullable(),
    affected_asset_id: z.string().uuid().optional().nullable(),
    related_threat_id: z.string().uuid().optional().nullable(),
    detection_source: z.string().optional(),
    resolution_notes: z.string().optional(),
  }),
});

export const vulnerabilitySchema = z.object({
  body: z.object({
    cve_id: z.string().regex(/^CVE-\d{4}-\d{4,7}$/i, 'Invalid CVE format (e.g. CVE-2024-1234)'),
    title: z.string().min(3, 'Title is required'),
    description: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    cvss_score: z.number().min(0.0).max(10.0),
    affected_asset_id: z.string().uuid('Affected asset is required'),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'PATCHED', 'ACCEPTED_RISK']).optional().default('OPEN'),
    remediation: z.string().optional(),
    due_date: z.string().optional(),
  }),
});

export const assetSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Asset name is required'),
    ip_address: z.string().ip({ version: 'v4', message: 'Valid IPv4 address is required' }),
    hostname: z.string().optional(),
    asset_type: z.enum(['Server', 'Workstation', 'Laptop', 'Database', 'Network Device', 'Cloud Resource', 'Application']),
    environment: z.string().default('Production'),
    owner: z.string().optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'DEGRADED', 'UNKNOWN']).optional().default('ONLINE'),
    criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  }),
});
