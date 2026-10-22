import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield, ArrowLeft, AlertTriangle, Bell, Server, Bug, Crosshair, Calendar, Info, Activity, ChevronRight
} from 'lucide-react';
import { threatService } from '../services';
import { Threat, RiskBreakdown, Incident, Alert, Asset, Vulnerability } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { RiskScore } from '../components/RiskScore';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';

export const ThreatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [threat, setThreat] = useState<Threat | null>(null);
  const [riskBreakdown, setRiskBreakdown] = useState<RiskBreakdown | null>(null);
  const [correlation, setCorrelation] = useState<{
    relatedIncidents: Incident[];
    relatedAlerts: Alert[];
    relatedAssets: Asset[];
    relatedVulnerabilities: Vulnerability[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    threatService
      .getById(id)
      .then((res) => {
        setThreat(res.data.data.threat);
        setRiskBreakdown(res.data.data.riskBreakdown);
        setCorrelation(res.data.data.correlation);
      })
      .catch((err) => setError(err.response?.data?.message || 'Threat indicator not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner text="Performing Threat Correlation & Calculating Risk Matrix..." size="lg" />;

  if (error || !threat) {
    return (
      <div className="p-8 text-center bg-white border border-red-200 rounded-xl shadow-sm my-6">
        <AlertTriangle size={36} className="mx-auto text-red-600 mb-2" />
        <h3 className="text-base font-bold text-slate-900 font-sans">Threat Record Not Found</h3>
        <p className="text-xs text-slate-600 mt-1 font-sans">{error}</p>
        <button
          onClick={() => navigate('/threats')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-semibold rounded-lg shadow-sm"
        >
          Return to Threat Intelligence
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => navigate('/threats')}
          className="flex items-center gap-2 text-xs font-sans font-semibold text-slate-500 hover:text-blue-600 mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Threat Intelligence
        </button>

        <PageHeader
          title={threat.indicator}
          description={threat.description || 'No analyst notes available for this indicator.'}
          icon={Shield}
          iconColor="text-blue-600"
          actions={
            <div className="flex items-center gap-2">
              <SeverityBadge severity={threat.severity} size="lg" />
              <StatusBadge status={threat.status} size="md" />
            </div>
          }
        />
      </div>

      {/* Main Investigation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview & Risk Calculation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Threat Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-sm font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info size={16} className="text-blue-600" /> Threat Indicator Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-medium">Indicator Value</span>
                <span className="font-mono font-bold text-slate-900 truncate block mt-0.5">{threat.indicator}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-medium">Indicator Type</span>
                <span className="font-sans font-semibold text-slate-900 block mt-0.5">{threat.indicator_type}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-medium">Threat Category</span>
                <span className="font-sans font-semibold text-slate-900 block mt-0.5">{threat.category}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-medium">Intelligence Source</span>
                <span className="font-sans font-semibold text-slate-900 block mt-0.5">{threat.source_name || 'Internal'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-medium">Telemetry Confidence</span>
                <span className="font-sans font-semibold text-blue-600 block mt-0.5">{threat.confidence}%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-medium">Recurrence Count</span>
                <span className="font-sans font-semibold text-slate-900 block mt-0.5">{threat.recurrence_count || 1} hits</span>
              </div>
            </div>
          </div>

          {/* Transparent Rule-Based Risk Scoring */}
          {riskBreakdown && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-sm font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-blue-600" /> Transparent Rule-Based Risk Scoring Breakdown
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                  <span className="text-[11px] font-sans font-medium text-slate-500 uppercase">Base Severity</span>
                  <p className="text-lg font-mono font-bold text-slate-900 mt-1">{riskBreakdown.severityScore} pts</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Weighted 65% in engine</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                  <span className="text-[11px] font-sans font-medium text-slate-500 uppercase">Confidence</span>
                  <p className="text-lg font-mono font-bold text-blue-600 mt-1">+{riskBreakdown.confidenceContribution} pts</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">From {threat.confidence}% telemetry</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                  <span className="text-[11px] font-sans font-medium text-slate-500 uppercase">Source Reliability</span>
                  <p className="text-lg font-mono font-bold text-slate-800 mt-1">+{riskBreakdown.sourceReliabilityContribution} pts</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Source rating factor</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                  <span className="text-[11px] font-sans font-medium text-slate-500 uppercase">Recurrence</span>
                  <p className="text-lg font-mono font-bold text-amber-600 mt-1">+{riskBreakdown.recurrenceContribution} pts</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Count: {threat.recurrence_count || 1}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <RiskScore score={riskBreakdown.score} size="lg" />
                <p className="text-xs font-sans text-slate-600 mt-2 leading-relaxed">{riskBreakdown.explanation}</p>
              </div>
            </div>
          )}

          {/* MITRE ATT&CK Mapping */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-sm font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Crosshair size={16} className="text-blue-600" /> MITRE ATT&amp;CK Framework Mapping
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <span className="text-[11px] font-sans font-medium text-slate-500 uppercase">Tactic</span>
                <p className="text-sm font-sans font-bold text-slate-900 mt-1">{threat.mitre_tactic || 'Command and Control'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <span className="text-[11px] font-sans font-medium text-slate-500 uppercase">Technique ID &amp; Name</span>
                <p className="text-sm font-mono font-bold text-blue-700 mt-1">{threat.mitre_technique || 'T1071 - Application Layer Protocol'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Correlation Network */}
        <div className="space-y-6">
          {/* Related Incidents */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" /> Related Incidents ({correlation?.relatedIncidents.length || 0})
            </h3>
            {correlation?.relatedIncidents.length === 0 ? (
              <p className="text-xs text-slate-500 font-sans py-3">No security incidents linked to this indicator.</p>
            ) : (
              <div className="space-y-2">
                {correlation?.relatedIncidents.map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/incidents/${inc.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{inc.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Analyst: {inc.analyst_name || 'Unassigned'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={inc.severity} size="sm" />
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Affected Assets */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Server size={16} className="text-blue-600" /> Impacted Assets ({correlation?.relatedAssets.length || 0})
            </h3>
            {correlation?.relatedAssets.length === 0 ? (
              <p className="text-xs text-slate-500 font-sans py-3">No internal assets currently impacted.</p>
            ) : (
              <div className="space-y-2">
                {correlation?.relatedAssets.map((ast) => (
                  <Link
                    key={ast.id}
                    to={`/assets/${ast.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{ast.name}</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">IP: {ast.ip_address}</p>
                    </div>
                    <StatusBadge status={ast.status} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Related Alerts */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell size={16} className="text-indigo-600" /> Triggered Alerts ({correlation?.relatedAlerts.length || 0})
            </h3>
            {correlation?.relatedAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 font-sans py-3">No alerts queued for this indicator.</p>
            ) : (
              <div className="space-y-2">
                {correlation?.relatedAlerts.map((alt) => (
                  <div key={alt.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-sans">
                    <span className="font-medium text-slate-900">{alt.title}</span>
                    <SeverityBadge severity={alt.severity} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
