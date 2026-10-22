import React from 'react';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const st = (status || 'ACTIVE').toUpperCase();

  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    ONLINE: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    INVESTIGATING: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    ACKNOWLEDGED: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    CONTAINED: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    PATCHED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    FALSE_POSITIVE: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    ACCEPTED_RISK: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    OPEN: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    NEW: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    OFFLINE: 'bg-red-50 text-red-700 border-red-200 font-medium',
    DEGRADED: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    ERROR: 'bg-red-50 text-red-700 border-red-200 font-medium',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs font-sans',
  };

  return (
    <span className={`inline-flex items-center rounded-md border font-sans ${styles[st] || 'bg-slate-100 text-slate-700 border-slate-200'} ${sizes[size]}`}>
      {st.replace('_', ' ')}
    </span>
  );
};
