import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Server, ArrowLeft, AlertTriangle, Bug, Bell, Shield, Activity } from 'lucide-react';
import { assetService } from '../services';
import { Asset, Incident, Vulnerability, Alert } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    assetService
      .getById(id)
      .then((res) => {
        setAsset(res.data.data.asset);
        setIncidents(res.data.data.related_incidents || []);
        setVulns(res.data.data.related_vulnerabilities || []);
        setAlerts(res.data.data.related_alerts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner text="Querying Asset Telemetry & Security Footprint..." size="lg" />;

  if (!asset) {
    return (
      <div className="p-8 text-center bg-soc-card border border-red-500/30 rounded-xl">
        <Server size={36} className="mx-auto text-red-400 mb-2" />
        <h3 className="text-sm font-bold text-white font-mono">Asset Not Found</h3>
        <button onClick={() => navigate('/assets')} className="mt-4 px-4 py-2 bg-blue-600 text-white font-mono text-xs rounded">
          Return to Asset Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/assets')} className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white mb-3">
          <ArrowLeft size={14} /> Back to Asset Inventory
        </button>

        <div className="bg-soc-card border border-soc-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
              <Server size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-white">{asset.name}</h1>
                <span className="text-xs text-cyan-400 font-mono">({asset.ip_address})</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Type: <strong>{asset.asset_type}</strong> | Environment: <strong>{asset.environment}</strong> | Owner: <strong>{asset.owner || 'Unassigned'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SeverityBadge severity={asset.criticality} size="md" />
            <StatusBadge status={asset.status} size="md" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linked Vulnerabilities */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-5">
          <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bug size={16} /> Open Vulnerabilities ({vulns.length})
          </h2>
          {vulns.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4">No open vulnerabilities detected on this endpoint.</p>
          ) : (
            <div className="space-y-2">
              {vulns.map((v) => (
                <div key={v.id} className="p-3 rounded bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold font-mono text-amber-400">{v.cve_id}</p>
                    <p className="text-[11px] text-slate-300 max-w-[180px] truncate">{v.title}</p>
                  </div>
                  <SeverityBadge severity={v.severity} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Incidents */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-5">
          <h2 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Security Incidents ({incidents.length})
          </h2>
          {incidents.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4">No security incidents associated with this asset.</p>
          ) : (
            <div className="space-y-2">
              {incidents.map((i) => (
                <Link key={i.id} to={`/incidents/${i.id}`} className="block p-3 rounded bg-white border border-slate-200 hover:bg-slate-800">
                  <p className="text-xs font-semibold text-white truncate">{i.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <SeverityBadge severity={i.severity} size="sm" />
                    <StatusBadge status={i.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Security Alerts */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-5">
          <h2 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell size={16} /> Asset Security Alerts ({alerts.length})
          </h2>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4">No recent security alerts for this endpoint.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((al) => (
                <div key={al.id} className="p-3 rounded bg-white border border-slate-200">
                  <p className="text-xs font-semibold text-white">{al.title}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-400">
                    <span>{al.alert_type}</span>
                    <SeverityBadge severity={al.severity} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

