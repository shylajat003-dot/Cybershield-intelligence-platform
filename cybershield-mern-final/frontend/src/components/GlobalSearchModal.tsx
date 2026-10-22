import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, AlertTriangle, Bug, Server, Bell, X, ArrowRight } from 'lucide-react';
import { searchService } from '../services';
import { SearchResults } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.search(query);
        setResults(res.data.data);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-16 px-4 bg-slate-900/40 backdrop-blur-sm animate-in">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
        <div className="relative flex items-center px-4 border-b border-slate-200 bg-white">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Global Search Across IOCs, CVEs, Incidents, Assets, Alerts..."
            className="w-full py-4 px-3 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-700">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 bg-slate-50">
          {loading && <p className="text-xs text-slate-500 font-mono text-center py-6">Searching CyberShield telemetry...</p>}

          {!loading && results && results.totalResults === 0 && (
            <p className="text-xs text-slate-500 font-mono text-center py-6">No matching entities found for "{query}"</p>
          )}

          {!loading && results && (
            <>
              {results.results.threats.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-600 uppercase tracking-wider mb-2">
                    <Shield size={14} /> Threat Indicators ({results.results.threats.length})
                  </div>
                  <div className="space-y-1">
                    {results.results.threats.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelect(`/threats/${t.id}`)}
                        className="flex items-center justify-between p-2.5 rounded bg-white hover:bg-blue-50 border border-slate-200 cursor-pointer transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-800">
                          <span className="font-bold text-slate-900">{t.indicator}</span>
                          <span className="text-[10px] text-slate-500">[{t.indicator_type}]</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.severity && <SeverityBadge severity={t.severity} size="sm" />}
                          <ArrowRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.results.incidents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-orange-600 uppercase tracking-wider mb-2">
                    <AlertTriangle size={14} /> Security Incidents ({results.results.incidents.length})
                  </div>
                  <div className="space-y-1">
                    {results.results.incidents.map((i) => (
                      <div
                        key={i.id}
                        onClick={() => handleSelect(`/incidents/${i.id}`)}
                        className="flex items-center justify-between p-2.5 rounded bg-white hover:bg-orange-50 border border-slate-200 cursor-pointer transition-colors shadow-xs"
                      >
                        <span className="text-xs font-medium text-slate-900">{i.title}</span>
                        <div className="flex items-center gap-2">
                          {i.severity && <SeverityBadge severity={i.severity} size="sm" />}
                          {i.status && <StatusBadge status={i.status} size="sm" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.results.vulnerabilities.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-600 uppercase tracking-wider mb-2">
                    <Bug size={14} /> Vulnerabilities ({results.results.vulnerabilities.length})
                  </div>
                  <div className="space-y-1">
                    {results.results.vulnerabilities.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => handleSelect('/vulnerabilities')}
                        className="flex items-center justify-between p-2.5 rounded bg-white hover:bg-amber-50 border border-slate-200 cursor-pointer transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-amber-700">{v.cve_id}</span>
                          <span className="text-slate-800">{v.title}</span>
                        </div>
                        {v.severity && <SeverityBadge severity={v.severity} size="sm" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.results.assets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                    <Server size={14} /> Monitored Assets ({results.results.assets.length})
                  </div>
                  <div className="space-y-1">
                    {results.results.assets.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => handleSelect(`/assets/${a.id}`)}
                        className="flex items-center justify-between p-2.5 rounded bg-white hover:bg-emerald-50 border border-slate-200 cursor-pointer transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-slate-900">{a.name}</span>
                          <span className="text-slate-500">({a.ip_address})</span>
                        </div>
                        {a.status && <StatusBadge status={a.status} size="sm" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Press ESC to close</span>
          <span>CyberShield Intelligence Index</span>
        </div>
      </div>
    </div>
  );
};


