import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, AlertTriangle, Bug, Server, Bell, ArrowRight, Activity, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { dashboardService } from '../services';
import { DashboardSummary } from '../types';
import { MetricCard } from '../components/MetricCard';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { RiskScore } from '../components/RiskScore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';

interface SeverityChartRow { severity: string; count: string; }
interface TypeChartRow { indicator_type: string; count: string; }
interface TrendRow { date: string; count: string; severity: string; }

const SEVERITY_FILL: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#16a34a',
};

const TYPE_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0284c7', '#e11d48'];

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [severityChartData, setSeverityChartData] = useState<{ name: string; count: number; fill: string }[]>([]);
  const [typeChartData, setTypeChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ day: string; threats: number }[]>([]);

  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, severityRes, typesRes, trendsRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getThreatSeverity(),
        dashboardService.getThreatTypes(),
        dashboardService.getThreatTrends(7),
      ]);

      setData(summaryRes.data.data);

      const sevRows: SeverityChartRow[] = severityRes.data.data.severity;
      setSeverityChartData(sevRows.map(r => ({
        name: r.severity,
        count: parseInt(r.count),
        fill: SEVERITY_FILL[r.severity] || '#64748b',
      })));

      const typeRows: TypeChartRow[] = typesRes.data.data.types;
      setTypeChartData(typeRows.map((r, i) => ({
        name: r.indicator_type,
        value: parseInt(r.count),
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      })));

      const trendRows: TrendRow[] = trendsRes.data.data.trends;
      const dayMap: Record<string, number> = {};
      trendRows.forEach(r => {
        const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
        dayMap[day] = (dayMap[day] || 0) + parseInt(r.count);
      });
      setTrendData(Object.entries(dayMap).map(([day, threats]) => ({ day, threats })));

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load SOC dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Fetching SOC Telemetry & Real-Time Metrics..." size="lg" />;

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white border border-red-200 rounded-2xl shadow-sm my-6">
        <AlertTriangle size={36} className="mx-auto text-red-600 mb-2" />
        <h3 className="text-base font-bold text-slate-900 font-sans">Unable to load dashboard data</h3>
        <p className="text-sm text-slate-600 mt-1 font-sans">{error}</p>
        <div className="flex justify-center gap-3 mt-5">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium text-xs rounded-lg shadow-sm"
          >
            Sign In Again
          </button>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-sans font-medium text-xs rounded-lg shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Security Overview"
        description="Monitor threats, incidents and security posture across your environment."
        icon={Activity}
        iconColor="text-blue-600"
        actions={
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Metrics
          </button>
        }
      />

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Threats" value={data.totalThreats} subtitle="Normalized IOCs" icon={Shield} color="blue" onClick={() => navigate('/threats')} />
        <MetricCard title="Critical Threats" value={data.criticalThreats} subtitle="Immediate Action" icon={ShieldAlert} color="red" onClick={() => navigate('/threats?severity=CRITICAL')} />
        <MetricCard title="Active Incidents" value={data.activeIncidents} subtitle="Under Investigation" icon={AlertTriangle} color="amber" onClick={() => navigate('/incidents')} />
        <MetricCard title="Open Vulns" value={data.openVulnerabilities} subtitle="Unpatched Assets" icon={Bug} color="cyan" onClick={() => navigate('/vulnerabilities')} />
        <MetricCard title="Monitored Assets" value={data.monitoredAssets} subtitle="Active Telemetry" icon={Server} color="green" onClick={() => navigate('/assets')} />
        <MetricCard title="Active Alerts" value={data.activeAlerts} subtitle="Unresolved Queue" icon={Bell} color="indigo" onClick={() => navigate('/alerts')} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Trend Over Time */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-xs">
          <h3 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4">
            Threat Ingestion Trends (7 Days)
          </h3>
          <div className="h-56 w-full">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">No trend data in last 7 days</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                  <Area type="monotone" dataKey="threats" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#threatGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Threat Severity Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-xs">
          <h3 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4">
            Threat Severity Distribution
          </h3>
          <div className="h-56 w-full">
            {severityChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">No threats found</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Indicator Type Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-xs">
          <h3 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4">
            Indicator Type Breakdown
          </h3>
          <div className="h-44 w-full flex items-center justify-center">
            {typeChartData.length === 0 ? (
              <span className="text-slate-400 text-xs font-sans">No indicators found</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4}>
                    {typeChartData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mt-3 text-xs font-sans text-slate-600">
            {typeChartData.map((t) => (
              <span key={t.name} className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name} ({t.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Critical Threats */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-sans text-red-600 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} /> Recent Critical Threats
            </h3>
            <button
              onClick={() => navigate('/threats')}
              className="text-xs font-sans font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {data.recentCriticalThreats.length === 0 ? (
            <p className="text-xs text-slate-500 font-sans py-4">No critical threats detected in the current period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase">
                    <th className="p-3 pl-4">Indicator</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Risk Score</th>
                    <th className="p-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {data.recentCriticalThreats.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/threats/${t.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 pl-4 font-mono font-bold text-slate-900 max-w-[160px] truncate">{t.indicator}</td>
                      <td className="p-3 text-slate-600 font-sans">{t.indicator_type}</td>
                      <td className="p-3">
                        <RiskScore score={t.risk_score} size="sm" />
                      </td>
                      <td className="p-3 pr-4">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Incidents */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-sans text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} /> Active Security Incidents
            </h3>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs font-sans font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {data.activeIncidentList.length === 0 ? (
            <p className="text-xs text-slate-500 font-sans py-4">No active incidents at this time.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase">
                    <th className="p-3 pl-4">Title</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Analyst</th>
                    <th className="p-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {data.activeIncidentList.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 pl-4 font-semibold text-slate-900 max-w-[190px] truncate">{inc.title}</td>
                      <td className="p-3">
                        <SeverityBadge severity={inc.severity} size="sm" />
                      </td>
                      <td className="p-3 text-xs text-slate-600 font-sans">{inc.analyst_name || 'Unassigned'}</td>
                      <td className="p-3 pr-4">
                        <StatusBadge status={inc.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
