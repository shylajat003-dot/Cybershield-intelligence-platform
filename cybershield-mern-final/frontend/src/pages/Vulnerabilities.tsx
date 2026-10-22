import React, { useEffect, useState } from 'react';
import { Bug, Plus, Search, RefreshCw, Trash2, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { vulnerabilityService, assetService } from '../services';
import { Vulnerability, Asset, Pagination as PaginationType } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Vulnerabilities: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    cve_id: 'CVE-2024-5599',
    title: 'Unauthenticated Remote Code Execution in Web Service',
    description: '',
    severity: 'CRITICAL',
    cvss_score: 9.8,
    affected_asset_id: '',
    remediation: 'Apply vendor hotfix v2.4.1 immediately.',
  });

  const fetchVulns = async () => {
    setLoading(true);
    try {
      const res = await vulnerabilityService.getAll({ page, limit: 15, search, severity, status });
      setVulns(res.data.data.vulnerabilities);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to fetch vulnerabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulns();
  }, [page, search, severity, status]);

  useEffect(() => {
    assetService.getAll().then((res) => {
      setAssets(res.data.data.assets);
      if (res.data.data.assets.length > 0) {
        setFormData((prev) => ({ ...prev, affected_asset_id: res.data.data.assets[0].id }));
      }
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vulnerabilityService.create(formData);
      success('Vulnerability Logged', `Registered ${formData.cve_id}`);
      setCreateModal(false);
      fetchVulns();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to add vulnerability');
    }
  };

  const handleDelete = async (id: string, cve: string) => {
    if (!window.confirm(`Delete vulnerability record ${cve}?`)) return;
    try {
      await vulnerabilityService.remove(id);
      success('Deleted', `Removed vulnerability ${cve}`);
      fetchVulns();
    } catch (err: any) {
      error('Error', 'Failed to delete record');
    }
  };

  const totalCount = pagination.total || vulns.length;
  const criticalCount = vulns.filter((v) => v.severity === 'CRITICAL').length;
  const highCount = vulns.filter((v) => v.severity === 'HIGH').length;
  const patchedCount = vulns.filter((v) => v.status === 'PATCHED').length;
  const openCount = vulns.filter((v) => v.status === 'OPEN' || v.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vulnerabilities"
        description="Monitor, analyze, and prioritize software vulnerabilities and CVE telemetry."
        actions={
          user?.role !== 'VIEWER' ? (
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Register CVE
            </button>
          ) : undefined
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Total Vulnerabilities" value={totalCount} icon={<Bug size={18} />} color="blue" />
        <MetricCard title="Critical" value={criticalCount} icon={<ShieldAlert size={18} />} color="red" />
        <MetricCard title="High" value={highCount} icon={<AlertTriangle size={18} />} color="amber" />
        <MetricCard title="Patched" value={patchedCount} icon={<CheckCircle2 size={18} />} color="emerald" />
        <MetricCard title="Open" value={openCount} icon={<Bug size={18} />} color="blue" />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[260px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search CVE ID, title..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="PATCHED">PATCHED</option>
            <option value="ACCEPTED_RISK">ACCEPTED RISK</option>
          </select>
        </div>

        <button
          onClick={fetchVulns}
          className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          title="Refresh telemetry"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner text="Loading vulnerability records..." />
        ) : vulns.length === 0 ? (
          <EmptyState title="No vulnerabilities found" description="No CVE records match your selected query filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">CVE ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">CVSS Score</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Affected Asset</th>
                  <th className="px-4 py-3">Patch Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {vulns.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-700">{v.cve_id}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900 max-w-[280px] truncate">{v.title}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          v.cvss_score >= 9.0
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : v.cvss_score >= 7.0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {v.cvss_score} / 10.0
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <SeverityBadge severity={v.severity} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{v.asset_name || 'Unspecified Asset'}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={v.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(v.id, v.cve_id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded"
                          title="Delete Vulnerability Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Register CVE Vulnerability">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">CVE ID *</label>
              <input
                type="text"
                required
                value={formData.cve_id}
                onChange={(e) => setFormData({ ...formData, cve_id: e.target.value })}
                placeholder="e.g. CVE-2024-1234"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">CVSS Score (0.0 - 10.0)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.cvss_score}
                onChange={(e) => setFormData({ ...formData, cvss_score: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Severity Rating</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Affected Monitored Asset</label>
              <select
                value={formData.affected_asset_id}
                onChange={(e) => setFormData({ ...formData, affected_asset_id: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.ip_address})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Remediation / Patch Instructions</label>
            <textarea
              rows={3}
              value={formData.remediation}
              onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Save CVE Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

