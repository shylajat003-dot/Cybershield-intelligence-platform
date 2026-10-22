import React, { useEffect, useRef, useState } from 'react';
import { Bell, RefreshCw, ShieldAlert, Radio } from 'lucide-react';
import { alertService } from '../services';
import { Alert, Pagination as PaginationType } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Alerts: React.FC = () => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await alertService.getAll({ page, limit: 15, severity, status });
      setAlerts(res.data.data.alerts);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      if (!silent) error('Error', err.response?.data?.message || 'Failed to fetch security alerts');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // SSE connection for real-time new-alert delivery
  useEffect(() => {
    const token = localStorage.getItem('cybershield_token');
    if (!token) return;

    // Open SSE stream â€” backend polls DB every 15s and pushes new alerts
    const sse = new EventSource(`/api/alerts/stream?token=${encodeURIComponent(token)}`);
    sseRef.current = sse;

    sse.onopen = () => {
      setSseConnected(true);
    };

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.alerts && payload.alerts.length > 0) {
          info(`${payload.alerts.length} new alert(s) received`, 'Alert queue updated');
          fetchAlerts(true);
        }
      } catch {}
    };

    sse.onerror = () => {
      setSseConnected(false);
      sse.close();
    };

    return () => {
      sse.close();
      setSseConnected(false);
    };
  }, []);

  // Polling fallback every 20s â€” also covers filter/page changes
  useEffect(() => {
    fetchAlerts();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchAlerts(true), 20000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [page, severity, status]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await alertService.update(id, { status: newStatus });
      success('Alert Updated', `Alert status marked as ${newStatus}`);
      fetchAlerts(true);
    } catch (err: any) {
      error('Error', 'Failed to update alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-soc-card p-4 rounded-xl border border-soc-border">
        <div>
          <h1 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <Bell className="text-indigo-400" size={20} />
            SECURITY ALERT CENTER
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">SSE Real-Time Stream + 20s Polling Fallback from PostgreSQL</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <Radio size={12} className={sseConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
            <span className={sseConnected ? 'text-emerald-400' : 'text-slate-500'}>
              {sseConnected ? 'Live SSE' : 'Polling'}
            </span>
          </div>
          <button onClick={() => fetchAlerts()} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-soc-border rounded text-xs font-mono text-slate-300">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="py-1.5 px-3 bg-white border border-soc-border rounded text-xs text-slate-300 font-mono focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
          <option value="INFO">INFO</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="py-1.5 px-3 bg-white border border-soc-border rounded text-xs text-slate-300 font-mono focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="NEW">NEW</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {loading ? (
          <LoadingSpinner text="Fetching security alerts from PostgreSQL..." />
        ) : alerts.length === 0 ? (
          <EmptyState title="No active security alerts" description="All clear! No pending alerts matching your filter query." />
        ) : (
          alerts.map((al) => {
            const isCritical = al.severity === 'CRITICAL';
            return (
              <div
                key={al.id}
                className={`bg-soc-card border rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCritical ? 'border-red-500/40 bg-red-500/5' : 'border-soc-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${isCritical ? 'bg-red-500/20 text-red-400' : 'bg-white text-blue-400'}`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white font-mono">{al.title}</h3>
                      <SeverityBadge severity={al.severity} size="sm" />
                      <StatusBadge status={al.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{al.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500 mt-2">
                      <span>Type: <strong className="text-slate-300">{al.alert_type}</strong></span>
                      <span>Source: <strong className="text-slate-300">{al.source || 'IDS Guard'}</strong></span>
                      {al.threat_indicator && <span>IOC: <strong className="text-blue-400">{al.threat_indicator}</strong></span>}
                      <span>Time: <strong>{new Date(al.created_at || '').toLocaleTimeString()}</strong></span>
                    </div>
                  </div>
                </div>

                {user?.role !== 'VIEWER' && (
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-soc-border pt-2 md:pt-0">
                    {al.status === 'NEW' && (
                      <button
                        onClick={() => handleUpdateStatus(al.id, 'ACKNOWLEDGED')}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-xs font-mono font-semibold"
                      >
                        Acknowledge
                      </button>
                    )}
                    {al.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleUpdateStatus(al.id, 'INVESTIGATING')}
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-xs font-mono font-semibold"
                      >
                        Investigate
                      </button>
                    )}
                    {al.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateStatus(al.id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-mono font-semibold"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
};

