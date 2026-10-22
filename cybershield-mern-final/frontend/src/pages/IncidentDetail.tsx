import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Clock, CheckCircle2, Shield, Server, User, Plus, MessageSquare, ShieldCheck
} from 'lucide-react';
import { incidentService } from '../services';
import { Incident, TimelineEntry } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchIncident = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await incidentService.getById(id);
      setIncident(res.data.data.incident);
      setResolutionNotes(res.data.data.incident.resolution_notes || '');
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!incident || !id) return;
    setUpdating(true);
    try {
      await incidentService.update(id, {
        status: newStatus,
        timeline_note: `Status updated to ${newStatus} by ${user?.name}`,
        resolution_notes: newStatus === 'RESOLVED' ? resolutionNotes : incident.resolution_notes,
      });
      success('Status Updated', `Incident status set to ${newStatus}`);
      fetchIncident();
    } catch (err: any) {
      error('Update Failed', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !id) return;
    setUpdating(true);
    try {
      await incidentService.update(id, { timeline_note: newNote });
      success('Timeline Note Added', 'Logged timeline entry successfully');
      setNewNote('');
      fetchIncident();
    } catch (err: any) {
      error('Failed', 'Unable to log note');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner text="Fetching Incident Timeline & Asset Forensics..." size="lg" />;

  if (!incident) {
    return (
      <div className="p-8 text-center bg-white border border-red-200 rounded-xl shadow-sm my-6">
        <AlertTriangle size={36} className="mx-auto text-red-600 mb-2" />
        <h3 className="text-base font-bold text-slate-900 font-sans">Incident Record Not Found</h3>
        <button onClick={() => navigate('/incidents')} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-semibold rounded-lg shadow-sm">
          Return to Incidents
        </button>
      </div>
    );
  }

  const statuses = ['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'];

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center gap-2 text-xs font-sans font-semibold text-slate-500 hover:text-blue-600 mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Incidents
        </button>

        <PageHeader
          title={incident.title}
          description={incident.description}
          icon={AlertTriangle}
          iconColor="text-amber-600"
          actions={<StatusBadge status={incident.status} size="md" />}
        />

        {/* Telemetry Overview Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 font-sans text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">Detection Source</span>
              <span className="font-semibold text-slate-900">{incident.detection_source || 'EDR Sensor'}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">Assigned Analyst</span>
              <span className="font-semibold text-slate-900">{incident.analyst_name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">Affected Asset</span>
              <span className="font-semibold text-slate-900">{incident.asset_name || 'N/A'}</span>
            </div>
          </div>
          <SeverityBadge severity={incident.severity} size="md" />
        </div>
      </div>

      {/* Incident Status Workflow Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-4">
          Incident Response Workflow Progress
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statuses.map((st, idx) => {
            const isCurrent = incident.status === st;
            const isPast = statuses.indexOf(incident.status) > idx;

            return (
              <button
                key={st}
                disabled={user?.role === 'VIEWER' || updating}
                onClick={() => handleStatusChange(st)}
                className={`p-3.5 rounded-xl border font-sans text-xs font-bold transition-all text-center flex flex-col items-center gap-2 ${
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm ring-2 ring-blue-500/20'
                    : isPast
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                {isPast ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Clock size={18} className={isCurrent ? 'text-blue-600' : 'text-slate-400'} />}
                <span>{st}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline & Resolution Notes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Log */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h2 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Forensics &amp; Response Timeline
          </h2>

          <div className="space-y-4 mb-6 border-l-2 border-slate-200 pl-4 ml-1">
            {incident.timeline?.map((item: TimelineEntry, idx: number) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                <div className="flex items-center justify-between text-xs font-sans text-slate-500">
                  <span className="font-semibold text-blue-600">{item.author}</span>
                  <span className="text-[11px]">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs font-sans font-semibold text-slate-900 mt-0.5">{item.action}</p>
                {item.notes && <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg mt-1.5 border border-slate-200 font-sans leading-relaxed">{item.notes}</p>}
              </div>
            ))}
          </div>

          {/* Add Timeline Note Form */}
          {user?.role !== 'VIEWER' && (
            <form onSubmit={handleAddNote} className="space-y-2.5 pt-4 border-t border-slate-200">
              <label className="block text-xs font-sans font-medium text-slate-700">Log Analyst Observation / Action</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="e.g. Memory dump extracted; firewall rule applied to block C2 egress..."
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans"
                />
                <button
                  type="submit"
                  disabled={updating || !newNote.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Plus size={14} /> Add Log
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Resolution Notes Sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold font-sans text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" /> Resolution &amp; Root Cause Notes
            </h2>
            <textarea
              rows={6}
              disabled={user?.role === 'VIEWER'}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Post-incident review, remediation steps taken, root cause analysis..."
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-600 disabled:opacity-60 placeholder-slate-400"
            />
          </div>

          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={updating}
              className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              Mark Incident as RESOLVED
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
