import React, { useEffect, useState } from 'react';
import { Crosshair, ChevronDown, ChevronRight, Database, AlertTriangle } from 'lucide-react';
import { mitreService } from '../services';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SeverityBadge } from '../components/SeverityBadge';
import { EmptyState } from '../components/EmptyState';

interface MitreTechnique {
  technique: string;
  severity: string;
  threat_count: number;
  max_risk_score: number;
  last_seen: string;
  indicator_types: string;
}

interface MitreTactic {
  tactic: string;
  techniques: MitreTechnique[];
}

interface MitreData {
  tactics: MitreTactic[];
  totalMappedThreats: number;
  unmappedThreats: number;
  source: string;
}

export const AttackTechniques: React.FC = () => {
  const [data, setData] = useState<MitreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await mitreService.getMappings();
        setData(res.data.data);
        // Auto-expand all tactics
        const init: Record<string, boolean> = {};
        (res.data.data.tactics as MitreTactic[]).forEach(t => { init[t.tactic] = true; });
        setExpanded(init);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load MITRE ATT&CK mappings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (tactic: string) => setExpanded(prev => ({ ...prev, [tactic]: !prev[tactic] }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            <Crosshair className="text-blue-600" size={22} />
            MITRE ATT&amp;CK FRAMEWORK MAPPING
          </h1>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
            Live threat-to-technique mapping from PostgreSQL — grouped by stored mitre_tactic / mitre_technique fields
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2 text-xs font-mono shrink-0 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Database size={14} className="text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Live DB</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-700 font-medium">{data.totalMappedThreats} mapped threats</span>
            {data.unmappedThreats > 0 && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{data.unmappedThreats} unmapped</span>
              </>
            )}
          </div>
        )}
      </div>

      {loading && <LoadingSpinner text="Loading MITRE ATT&CK mappings from database..." />}

      {error && (
        <div className="p-8 text-center bg-white border border-red-200 rounded-xl shadow-sm">
          <AlertTriangle size={36} className="mx-auto text-red-500 mb-2" />
          <h3 className="text-sm font-bold text-slate-900 font-mono">Failed to load MITRE mappings</h3>
          <p className="text-xs text-slate-600 mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && data?.tactics.length === 0 && (
        <EmptyState
          title="No MITRE mappings found"
          description="Ingest threats with mitre_tactic or mitre_technique fields populated to see ATT&CK mapping here. Seed data adds pre-mapped threats automatically."
        />
      )}

      {!loading && !error && data && data.tactics.length > 0 && (
        <div className="space-y-4">
          {data.tactics.map((tactic) => {
            const isOpen = expanded[tactic.tactic];
            const tacticThreatCount = tactic.techniques.reduce((s, t) => s + t.threat_count, 0);

            return (
              <div
                key={tactic.tactic}
                className="border rounded-xl overflow-hidden shadow-sm transition-all"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                {/* Tactic Header — Clean White Card Category Header */}
                <button
                  onClick={() => toggle(tactic.tactic)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                      <Crosshair size={16} />
                    </div>
                    <span className="font-bold font-mono text-sm uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      {tactic.tactic}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                      {tacticThreatCount} threat{tacticThreatCount !== 1 ? 's' : ''} · {tactic.techniques.length} technique{tactic.techniques.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={18} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={18} className="text-slate-500" />
                  )}
                </button>

                {/* Technique List Table */}
                {isOpen && (
                  <div className="border-t border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                            <th className="p-3 pl-4">Technique</th>
                            <th className="p-3">Severity</th>
                            <th className="p-3 text-center">Threats</th>
                            <th className="p-3 text-center">Max Risk</th>
                            <th className="p-3">Indicator Types</th>
                            <th className="p-3 pr-4">Last Seen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tactic.techniques.map((tech, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 pl-4 text-slate-900 font-semibold">{tech.technique}</td>
                              <td className="p-3">
                                <SeverityBadge severity={tech.severity} size="sm" />
                              </td>
                              <td className="p-3 text-center text-slate-700 font-medium">{tech.threat_count}</td>
                              <td className="p-3 text-center">
                                <span className={`font-bold ${tech.max_risk_score >= 80 ? 'text-red-600' : tech.max_risk_score >= 60 ? 'text-orange-600' : 'text-amber-600'}`}>
                                  {tech.max_risk_score}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600">{tech.indicator_types || '—'}</td>
                              <td className="p-3 pr-4 text-slate-500">
                                {tech.last_seen ? new Date(tech.last_seen).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

