import React, { useEffect, useState } from 'react';
import { Radio, Plus, Search, RefreshCw, Trash2, CheckCircle2, AlertOctagon, ShieldCheck, Activity } from 'lucide-react';
import { sourceService } from '../services';
import { ThreatSource, Pagination as PaginationType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ThreatSources: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [sources, setSources] = useState<ThreatSource[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: 'AlienVault OTX API Feed',
    type: 'External Feed',
    description: 'Open Threat Exchange automated IP & hash intelligence',
    reliability_score: 90,
  });

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await sourceService.getAll({ page, limit: 15, search });
      setSources(res.data.data.sources);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to fetch threat sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sourceService.create(formData);
      success('Source Registered', `Added source ${formData.name}`);
      setCreateModal(false);
      fetchSources();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to create source');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete threat source ${name}?`)) return;
    try {
      await sourceService.remove(id);
      success('Deleted', `Removed source ${name}`);
      fetchSources();
    } catch (err: any) {
      error('Error', 'Failed to delete source');
    }
  };

  const totalSources = pagination.total || sources.length;
  const activeSources = sources.filter((s) => s.status === 'ACTIVE').length;
  const avgReliability = sources.length > 0 
    ? Math.round(sources.reduce((acc, curr) => acc + (curr.reliability_score || 0), 0) / sources.length) 
    : 0;
  const totalIndicators = sources.reduce((acc, curr) => acc + (curr.indicator_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Threat Intelligence Sources & Feeds"
        description="Multi-source Ingestion Health, Reliability Scoring & Indicator Influx."
        actions={
          user?.role === 'ADMIN' ? (
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Register Threat Source
            </button>
          ) : undefined
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Feeds" value={totalSources} icon={Radio} color="blue" />
        <MetricCard title="Active Sources" value={activeSources} icon={CheckCircle2} color="green" />
        <MetricCard title="Avg Reliability" value={`${avgReliability}%`} icon={ShieldCheck} color="indigo" />
        <MetricCard title="Total Indicators" value={totalIndicators.toLocaleString()} icon={Activity} color="cyan" />
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
              placeholder="Search source name, type..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <button
          onClick={fetchSources}
          className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          title="Refresh Sources"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner text="Connecting to Threat Source registry..." />
        ) : sources.length === 0 ? (
          <EmptyState title="No threat sources registered" description="No intelligence feeds or sensors configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Source Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reliability Score</th>
                  <th className="px-4 py-3">Indicator Count</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-[250px] truncate">
                      {s.name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{s.type}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">{s.reliability_score}%</span>
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.reliability_score}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-blue-700 font-mono font-semibold">
                      {(s.indicator_count || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Source"
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
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Register Threat Intelligence Source">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="Internal">Internal</option>
                <option value="External Feed">External Feed</option>
                <option value="Security Tool">Security Tool</option>
                <option value="Manual">Manual</option>
                <option value="API">API</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reliability Score ({formData.reliability_score}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.reliability_score}
                onChange={(e) => setFormData({ ...formData, reliability_score: parseInt(e.target.value) })}
                className="w-full accent-blue-600 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Save Threat Source
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


