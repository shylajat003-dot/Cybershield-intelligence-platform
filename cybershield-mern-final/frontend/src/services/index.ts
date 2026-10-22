import api from './api';
import { ApiResponse, DashboardSummary } from '../types';

export const dashboardService = {
  getSummary: () => api.get<ApiResponse<DashboardSummary>>('/dashboard/summary'),
  getThreatTrends: (days = 7) => api.get(`/dashboard/threat-trends?days=${days}`),
  getThreatSeverity: () => api.get('/dashboard/threat-severity'),
  getThreatTypes: () => api.get('/dashboard/threat-types'),
  getIncidentStatus: () => api.get('/dashboard/incident-status'),
  getVulnerabilitySummary: () => api.get('/dashboard/vulnerability-summary'),
  getTopSources: () => api.get('/dashboard/top-sources'),
  getReports: (period = 7) => api.get(`/dashboard/reports?period=${period}`),
};

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role?: string) =>
    api.post('/auth/register', { name, email, password, role }),
  getMe: () => api.get('/auth/me'),
};

export const threatService = {
  getAll: (params?: Record<string, string | number>) => api.get('/threats', { params }),
  getById: (id: string) => api.get(`/threats/${id}`),
  create: (data: Record<string, unknown>) => api.post('/threats', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/threats/${id}`, data),
  remove: (id: string) => api.delete(`/threats/${id}`),
  ingest: (data: Record<string, unknown>) => api.post('/threats/ingest', data),
};

export const incidentService = {
  getAll: (params?: Record<string, string | number>) => api.get('/incidents', { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  create: (data: Record<string, unknown>) => api.post('/incidents', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/incidents/${id}`, data),
  remove: (id: string) => api.delete(`/incidents/${id}`),
};

export const vulnerabilityService = {
  getAll: (params?: Record<string, string | number>) => api.get('/vulnerabilities', { params }),
  getById: (id: string) => api.get(`/vulnerabilities/${id}`),
  create: (data: Record<string, unknown>) => api.post('/vulnerabilities', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/vulnerabilities/${id}`, data),
  remove: (id: string) => api.delete(`/vulnerabilities/${id}`),
};

export const assetService = {
  getAll: (params?: Record<string, string | number>) => api.get('/assets', { params }),
  getById: (id: string) => api.get(`/assets/${id}`),
  create: (data: Record<string, unknown>) => api.post('/assets', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/assets/${id}`, data),
  remove: (id: string) => api.delete(`/assets/${id}`),
};

export const alertService = {
  getAll: (params?: Record<string, string | number>) => api.get('/alerts', { params }),
  create: (data: Record<string, unknown>) => api.post('/alerts', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/alerts/${id}`, data),
};

export const sourceService = {
  getAll: (params?: Record<string, string | number>) => api.get('/sources', { params }),
  create: (data: Record<string, unknown>) => api.post('/sources', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/sources/${id}`, data),
  remove: (id: string) => api.delete(`/sources/${id}`),
};

export const auditService = {
  getAll: (params?: Record<string, string | number>) => api.get('/audit-logs', { params }),
  getUsers: () => api.get('/users'),
};

export const searchService = {
  search: (q: string) => api.get(`/search?q=${encodeURIComponent(q)}`),
};

export const mitreService = {
  // Returns threats grouped by their stored mitre_tactic + mitre_technique DB fields
  getMappings: () => api.get('/mitre/mappings'),
};
