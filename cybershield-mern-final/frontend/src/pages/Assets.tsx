import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Plus, Search, RefreshCw, Eye, Trash2, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { assetService } from '../services';
import { Asset, Pagination as PaginationType } from '../types';
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

export const Assets: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [criticality, setCriticality] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: 'PCI-Compliance-Vault-01',
    ip_address: '10.0.1.99',
    hostname: 'pci-vault.internal',
    asset_type: 'Server',
    environment: 'Production',
    owner: 'SecOps Infrastructure',
    criticality: 'CRITICAL',
  });

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await assetService.getAll({ page, limit: 15, search, criticality, status });
      setAssets(res.data.data.assets);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to fetch asset inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page, search, criticality, status]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assetService.create(formData);
      success('Asset Registered', `Added ${formData.name} (${formData.ip_address})`);
      setCreateModal(false);
      fetchAssets();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to register asset');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove asset ${name} from inventory?`)) return;
    try {
      await assetService.remove(id);
      success('Deleted', `Removed asset ${name}`);
      fetchAssets();
    } catch (err: any) {
      error('Error', 'Failed to remove asset');
    }
  };

  const totalAssets = pagination.total || assets.length;
  const criticalAssets = assets.filter((a) => a.criticality === 'CRITICAL').length;
  const atRiskAssets = assets.filter((a) => (a.threat_count || 0) > 0 || (a.vuln_count || 0) > 0 || (a.risk_score || 0) >= 60).length;
  const healthyAssets = assets.filter((a) => a.status === 'ONLINE' && (a.risk_score || 0) < 60).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitored Assets"
        description="Track infrastructure inventory, network endpoints, criticality, and security posture."
        actions={
          user?.role !== 'VIEWER' ? (
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Register Asset
            </button>
          ) : undefined
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Assets" value={totalAssets} icon={<Server size={18} />} color="blue" />
        <MetricCard title="Critical Assets" value={criticalAssets} icon={<ShieldAlert size={18} />} color="red" />
        <MetricCard title="At Risk" value={atRiskAssets} icon={<AlertTriangle size={18} />} color="amber" />
        <MetricCard title="Healthy" value={healthyAssets} icon={<CheckCircle2 size={18} />} color="emerald" />
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
              placeholder="Search asset name, IP, hostname..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <select
            value={criticality}
            onChange={(e) => setCriticality(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="">All Criticality</option>
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
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="DEGRADED">DEGRADED</option>
          </select>
        </div>

        <button
          onClick={fetchAssets}
          className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          title="Refresh inventory"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner text="Loading monitored asset inventory..." />
        ) : assets.length === 0 ? (
          <EmptyState title="No monitored assets found" description="No assets match your current search query." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Criticality</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-900">{a.name}</td>
                    <td className="px-4 py-3.5 font-mono font-medium text-blue-700">{a.ip_address}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{a.asset_type}</td>
                    <td className="px-4 py-3.5">
                      <SeverityBadge severity={a.criticality} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{a.environment}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={a.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/assets/${a.id}`)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded"
                          title="View Asset Telemetry & Linked Threats"
                        >
                          <Eye size={16} />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(a.id, a.name)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded"
                            title="Delete Asset"
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

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Register Monitored Asset">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Asset Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">IPv4 Address *</label>
              <input
                type="text"
                required
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="10.0.1.50"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Asset Type</label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="Server">Server</option>
                <option value="Workstation">Workstation</option>
                <option value="Laptop">Laptop</option>
                <option value="Database">Database</option>
                <option value="Network Device">Network Device</option>
                <option value="Cloud Resource">Cloud Resource</option>
                <option value="Application">Application</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Criticality</label>
              <select
                value={formData.criticality}
                onChange={(e) => setFormData({ ...formData, criticality: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Environment</label>
              <input
                type="text"
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Owner / Team</label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
              />
            </div>
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
              Save Asset
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

