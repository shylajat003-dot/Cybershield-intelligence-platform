import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Search, Filter, RefreshCw, Trash2, Eye, Download, Upload } from 'lucide-react';
import { threatService, sourceService } from '../services';
import { Threat, Pagination as PaginationType, ThreatSource } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { RiskScore } from '../components/RiskScore';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Threats: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [threats, setThreats] = useState<Threat[]>([]);
  const [sources, setSources] = useState<ThreatSource[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [page, setPage] = useState(1);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [ingestModal, setIngestModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    indicator: '',
    indicator_type: 'IP',
    category: 'Malware',
    severity: 'HIGH',
    confidence: 80,
    description: '',
    source_id: '',
    mitre_tactic: 'Command and Control',
    mitre_technique: 'T1071 - Application Layer Protocol',
  });

  const [ingestData, setIngestData] = useState({
    indicator: '198.51.100.22',
    indicatorType: 'IP',
    category: 'Botnet',
    severity: 'CRITICAL',
    confidence: 95,
    description: 'Automated Feed Ingestion Sample',
  });

  const fetchThreats = async () => {
    setLoading(true);
    try {
      const res = await threatService.getAll({ page, limit: 15, search, severity, type, status, sort });
      setThreats(res.data.data.threats);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to fetch threat telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [page, search, severity, type, status, sort]);

  useEffect(() => {
    sourceService.getAll().then((res) => setSources(res.data.data.sources)).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await threatService.create(formData);
      success('Threat Indicator Registered', `Successfully added ${formData.indicator}`);
      setCreateModal(false);
      fetchThreats();
    } catch (err: any) {
      error('Creation Error', err.response?.data?.message || 'Failed to create threat indicator');
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await threatService.ingest(ingestData);
      success('Feed Ingested', `Ingested and normalized indicator ${ingestData.indicator}`);
      setIngestModal(false);
      fetchThreats();
    } catch (err: any) {
      error('Ingestion Error', err.response?.data?.message || 'Failed to ingest feed');
    }
  };

  const handleDelete = async (id: string, indicator: string) => {
    if (!window.confirm(`Are you sure you want to delete threat indicator ${indicator}?`)) return;
    try {
      await threatService.remove(id);
      success('Deleted', `Removed threat indicator ${indicator}`);
      fetchThreats();
    } catch (err: any) {
      error('Deletion Error', err.response?.data?.message || 'Failed to delete threat');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Intelligence"
        description="Monitor, analyze and prioritize indicators of compromise across enterprise network telemetry."
        icon={Shield}
        iconColor="text-blue-600"
        actions={
          user?.role !== 'VIEWER' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIngestModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-700 font-semibold transition-colors shadow-xs"
              >
                <Upload size={14} /> Ingest Feed API
              </button>
              <button
                onClick={() => setCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-bold shadow-xs transition-all"
              >
                <Plus size={14} /> Register IOC
              </button>
            </div>
          )
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indicator, category..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-600"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-600"
          >
            <option value="">All Indicator Types</option>
            <option value="IP">IP Address</option>
            <option value="DOMAIN">Domain</option>
            <option value="URL">URL</option>
            <option value="HASH">File Hash</option>
            <option value="EMAIL">Email</option>
            <option value="FILE">File</option>
            <option value="CERTIFICATE">Certificate</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-600"
          >
            <option value="created_at">Sort: Created Date</option>
            <option value="risk_score">Sort: Risk Score</option>
            <option value="confidence">Sort: Confidence</option>
          </select>

          <button onClick={fetchThreats} className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-slate-900 rounded shadow-sm">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner text="Loading IOC dataset..." />
        ) : threats.length === 0 ? (
          <EmptyState title="No threat indicators found" description="Try resetting your filters or register a new IOC indicator." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="p-3 pl-4">Indicator</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {threats.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 font-bold text-slate-900 max-w-[200px] truncate">{t.indicator}</td>
                    <td className="p-3 text-slate-600">{t.indicator_type}</td>
                    <td className="p-3 text-slate-700">{t.category}</td>
                    <td className="p-3">
                      <SeverityBadge severity={t.severity} size="sm" />
                    </td>
                    <td className="p-3">
                      <RiskScore score={t.risk_score} size="sm" />
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{t.source_name || 'Manual'}</td>
                    <td className="p-3">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/threats/${t.id}`)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="View Threat Detail & Correlations"
                        >
                          <Eye size={16} />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(t.id, t.indicator)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete Threat"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create Threat Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Register Threat Indicator (IOC)">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Indicator Value *</label>
            <input
              type="text"
              required
              value={formData.indicator}
              onChange={(e) => setFormData({ ...formData, indicator: e.target.value })}
              placeholder="e.g. 198.51.100.99 or malware-domain.org"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Indicator Type</label>
              <select
                value={formData.indicator_type}
                onChange={(e) => setFormData({ ...formData, indicator_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              >
                <option value="IP">IP Address</option>
                <option value="DOMAIN">Domain</option>
                <option value="URL">URL</option>
                <option value="HASH">File Hash</option>
                <option value="EMAIL">Email</option>
                <option value="FILE">File Name</option>
                <option value="CERTIFICATE">TLS Certificate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Threat Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              >
                <option value="Malware">Malware</option>
                <option value="Phishing">Phishing</option>
                <option value="Botnet">Botnet</option>
                <option value="Ransomware">Ransomware</option>
                <option value="Credential Theft">Credential Theft</option>
                <option value="Command & Control">Command & Control</option>
                <option value="Data Exfiltration">Data Exfiltration</option>
                <option value="Brute Force">Brute Force</option>
                <option value="Suspicious Activity">Suspicious Activity</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Severity Rating</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Confidence ({formData.confidence}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value) })}
                className="w-full accent-blue-600 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Description / Analyst Notes</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Context regarding malware strain, campaign name, or OSINT references..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-mono font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-mono font-bold shadow-sm">
              Save Indicator
            </button>
          </div>
        </form>
      </Modal>

      {/* Ingest Feed Modal */}
      <Modal isOpen={ingestModal} onClose={() => setIngestModal(false)} title="Simulate Multi-Source API Threat Ingestion">
        <form onSubmit={handleIngest} className="space-y-4">
          <p className="text-xs text-slate-600 font-mono">
            Sends an ingestion payload to <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">POST /api/threats/ingest</code> to test normalization, risk scoring, and real-time alert trigger.
          </p>

          <div>
            <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Raw Indicator</label>
            <input
              type="text"
              required
              value={ingestData.indicator}
              onChange={(e) => setIngestData({ ...ingestData, indicator: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Indicator Type</label>
              <select
                value={ingestData.indicatorType}
                onChange={(e) => setIngestData({ ...ingestData, indicatorType: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              >
                <option value="IP">IP</option>
                <option value="DOMAIN">DOMAIN</option>
                <option value="HASH">HASH</option>
                <option value="URL">URL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-700 font-medium mb-1">Severity</label>
              <select
                value={ingestData.severity}
                onChange={(e) => setIngestData({ ...ingestData, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIngestModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-mono font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold shadow-sm">
              Execute Ingestion API
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
