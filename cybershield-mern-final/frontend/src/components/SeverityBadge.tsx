import React from 'react';
import { Severity } from '../types';

interface Props {
  severity: Severity | string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<Props> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'LOW').toUpperCase();

  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200 font-semibold',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    INFO: 'bg-sky-50 text-sky-700 border-sky-200 font-medium',
  };

  const dotStyles: Record<string, string> = {
    CRITICAL: 'bg-red-600 animate-pulse',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-emerald-500',
    INFO: 'bg-sky-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-sans rounded-md border ${styles[sev] || styles.LOW} ${sizes[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[sev] || dotStyles.LOW}`} />
      {sev}
    </span>
  );
};
