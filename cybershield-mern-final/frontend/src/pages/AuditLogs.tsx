import React, { useEffect, useState } from 'react';
import { Activity, Search, RefreshCw, UserCheck, Shield } from 'lucide-react';
import { auditService } from '../services';
import { AuditLog, Pagination as PaginationType } from '../types';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export const AuditLogs: React.FC = () => {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await auditService.getAll({ page, limit: 30, action, entity });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, action, entity]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-soc-card p-4 rounded-xl border border-soc-border">
        <div>
          <h1 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <Activity className="text-red-400" size={20} />
            SECURITY AUDIT TRAIL LOGS
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Immutable Administrative Action History & Compliance Tracking</p>
        </div>

        <button onClick={fetchAuditLogs} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-soc-border rounded text-xs font-mono text-slate-300">
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Table */}
      <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner text="Reading audit telemetry log store..." />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit logs recorded" description="No administrative action records found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-soc-border">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white transition-colors">
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(log.created_at || '').toLocaleString()}</td>
                    <td className="p-3 font-bold text-white">{log.user_email || 'System'}</td>
                    <td className="p-3 text-slate-400">{log.user_role || 'SYSTEM'}</td>
                    <td className="p-3 font-bold text-blue-400">{log.action}</td>
                    <td className="p-3 text-slate-300">{log.entity}</td>
                    <td className="p-3 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
};

