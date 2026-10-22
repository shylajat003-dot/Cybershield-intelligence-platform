import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Search, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { incidentService } from '../services';
import { Incident, Pagination as PaginationType } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Incidents: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    status: 'OPEN',
    detection_source: 'EDR Alert System',
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await incidentService.getAll({ page, limit: 15, search, severity, status });
      setIncidents(res.data.data.incidents);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to fetch security incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, search, severity, status]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await incidentService.create(formData);
      success('Incident Created', `Registered new incident: ${formData.title}`);
      setCreateModal(false);
      fetchIncidents();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to create incident');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete incident "${title}"?`)) return;
    try {
      await incidentService.remove(id);
      success('Deleted', `Removed incident: ${title}`);
      fetchIncidents();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to delete incident');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Security Incidents"
        description="Track, triage, and contain security incidents across your organization."
        icon={AlertTriangle}
        iconColor="text-amber-600"
        actions={
          user?.role !== 'VIEWER' && (
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-bold shadow-xs transition-all"
            >
              <Plus size={14} /> Declare Incident
            </button>
          )
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incident title, description..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-sans focus:outline-none focus:border-blue-600"
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
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-sans focus:outline-none focus:border-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="CONTAINED">CONTAINED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        <button onClick={fetchIncidents} className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg shadow-xs">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <LoadingSpinner text="Loading incident repository..." />
        ) : incidents.length === 0 ? (
          <EmptyState title="No active incidents found" description="No security incidents match your current search criteria." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Incident Title</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Status Workflow</th>
                  <th className="p-3">Assigned Analyst</th>
                  <th className="p-3">Affected Asset</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 font-semibold text-slate-900 max-w-[240px] truncate">{inc.title}</td>
                    <td className="p-3">
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={inc.status} size="sm" />
                    </td>
                    <td className="p-3 text-slate-700">{inc.analyst_name || 'Unassigned'}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{inc.asset_name || 'N/A'}</td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(inc.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/incidents/${inc.id}`)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="View Incident Timeline & Resolution"
                        >
                          <Eye size={16} />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(inc.id, inc.title)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete Incident"
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

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Declare Security Incident">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-sans text-slate-700 font-medium mb-1">Incident Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Unauthorized SSH Privilege Escalation on Prod Node"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-sans text-slate-700 font-medium mb-1">Incident Description *</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of attack vector, affected systems, and initial observations..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-sans text-slate-700 font-medium mb-1">Severity Rating</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-600"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-sans text-slate-700 font-medium mb-1">Detection Source</label>
              <input
                type="text"
                value={formData.detection_source}
                onChange={(e) => setFormData({ ...formData, detection_source: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-sans font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-bold shadow-xs">
              Declare Incident
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
