import React, { useEffect, useState } from 'react';
import { Radio, Plus, Search, RefreshCw, Trash2, CheckCircle2, AlertOctagon } from 'lucide-react';
import { sourceService } from '../services';
import { ThreatSource, Pagination as PaginationType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-soc-card p-4 rounded-xl border border-soc-border">
        <div>
          <h1 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <Radio className="text-blue-400" size={20} />
            THREAT INTELLIGENCE SOURCES & FEEDS
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Multi-source Ingestion Health, Reliability Scoring & Indicator Influx</p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus size={14} /> Add Threat Feed Source
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner text="Connecting to Threat Source registry..." />
        ) : sources.length === 0 ? (
          <EmptyState title="No threat sources registered" description="No intelligence feeds or sensors configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-soc-border">
                <tr>
                  <th className="p-3">Source Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reliability Score</th>
                  <th className="p-3">Indicator Count</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border text-slate-300">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-white transition-colors">
                    <td className="p-3 font-bold text-white max-w-[200px] truncate">{s.name}</td>
                    <td className="p-3 text-slate-400">{s.type}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">{s.reliability_score}%</span>
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${s.reliability_score}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-cyan-400 font-bold">{s.indicator_count.toLocaleString()}</td>
                    <td className="p-3">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="p-3 text-right">
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
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
            <label className="block text-xs font-mono text-slate-300 mb-1">Source Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-soc-border rounded text-xs text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Source Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-soc-border rounded text-xs text-white font-mono"
              >
                <option value="Internal">Internal</option>
                <option value="External Feed">External Feed</option>
                <option value="Security Tool">Security Tool</option>
                <option value="Manual">Manual</option>
                <option value="API">API</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Reliability Score ({formData.reliability_score}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.reliability_score}
                onChange={(e) => setFormData({ ...formData, reliability_score: parseInt(e.target.value) })}
                className="w-full accent-blue-500 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-soc-border rounded text-xs text-white font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-mono">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold">
              Save Threat Source
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

