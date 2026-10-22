import React, { useEffect, useState } from 'react';
import { FileText, Printer, Calendar, Shield, AlertTriangle, Bug, Bell } from 'lucide-react';
import { dashboardService } from '../services';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Reports: React.FC = () => {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardService
      .getReports(period)
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-soc-card p-4 rounded-xl border border-soc-border print:hidden">
        <div>
          <h1 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <FileText className="text-blue-400" size={20} />
            EXECUTIVE SECURITY OPERATIONS REPORT
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Comprehensive Cyber Threat & Incident Analytics Summary</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-soc-border rounded p-1">
            <button
              onClick={() => setPeriod(1)}
              className={`px-3 py-1 text-xs font-mono rounded ${period === 1 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              24h
            </button>
            <button
              onClick={() => setPeriod(7)}
              className={`px-3 py-1 text-xs font-mono rounded ${period === 7 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod(30)}
              className={`px-3 py-1 text-xs font-mono rounded ${period === 30 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold shadow transition-all"
          >
            <Printer size={14} /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document Body */}
      {loading ? (
        <LoadingSpinner text="Generating executive report document..." />
      ) : (
        <div className="bg-soc-card border border-soc-border rounded-xl p-8 space-y-8 print:bg-white print:text-black print:p-0 print:border-none">
          <div className="flex justify-between items-start border-b border-soc-border print:border-black pb-6">
            <div>
              <h2 className="text-xl font-bold font-mono text-white print:text-black">CYBERSHIELD INTELLIGENCE PLATFORM</h2>
              <p className="text-xs font-mono text-blue-400 print:text-black mt-1">SOC Executive Summary & Threat Intelligence Digest</p>
            </div>
            <div className="text-right text-xs font-mono text-slate-400 print:text-black">
              <p>Generated: {new Date().toLocaleDateString()}</p>
              <p>Reporting Interval: Last {period} Days</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white print:bg-gray-100 border border-slate-200 p-4 rounded-lg">
              <span className="text-[10px] font-mono text-slate-400 print:text-gray-600 uppercase">Threat Indicators</span>
              <p className="text-2xl font-bold font-mono text-white print:text-black mt-1">{data?.threats?.total || 0}</p>
              <p className="text-[11px] text-red-400 mt-1 font-mono">{data?.threats?.critical || 0} Critical Severity</p>
            </div>

            <div className="bg-white print:bg-gray-100 border border-slate-200 p-4 rounded-lg">
              <span className="text-[10px] font-mono text-slate-400 print:text-gray-600 uppercase">Incidents Resolved</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 print:text-black mt-1">{data?.incidents?.resolved || 0}</p>
              <p className="text-[11px] text-amber-400 mt-1 font-mono">{data?.incidents?.active || 0} Currently Active</p>
            </div>

            <div className="bg-white print:bg-gray-100 border border-slate-200 p-4 rounded-lg">
              <span className="text-[10px] font-mono text-slate-400 print:text-gray-600 uppercase">Patched Vulnerabilities</span>
              <p className="text-2xl font-bold font-mono text-cyan-400 print:text-black mt-1">{data?.vulnerabilities?.patched || 0}</p>
              <p className="text-[11px] text-red-400 mt-1 font-mono">{data?.vulnerabilities?.critical || 0} High CVSS Score</p>
            </div>

            <div className="bg-white print:bg-gray-100 border border-slate-200 p-4 rounded-lg">
              <span className="text-[10px] font-mono text-slate-400 print:text-gray-600 uppercase">Security Alerts</span>
              <p className="text-2xl font-bold font-mono text-indigo-400 print:text-black mt-1">{data?.alerts?.total || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{data?.alerts?.resolved || 0} Handled</p>
            </div>
          </div>

          <div className="space-y-4 text-xs font-mono text-slate-300 print:text-black leading-relaxed">
            <h3 className="text-sm font-bold text-white print:text-black uppercase">Executive Operational Summary</h3>
            <p>
              During the trailing {period}-day monitoring period, CyberShield Platform ingested and normalized{' '}
              <strong>{data?.threats?.total || 0}</strong> threat indicators across network, domain, and file telemetry endpoints.
              Our automated rule-based risk engine isolated <strong>{data?.threats?.critical || 0}</strong> critical severity threats,
              triggering real-time containment procedures.
            </p>
            <p>
              Security Analysts successfully resolved <strong>{data?.incidents?.resolved || 0}</strong> security incidents, ensuring zero
              unauthorized data exfiltration across core production database clusters.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

