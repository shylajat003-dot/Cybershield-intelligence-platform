import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'red' | 'amber' | 'cyan' | 'green' | 'indigo';
  onClick?: () => void;
}

export const MetricCard: React.FC<Props> = ({ title, value, subtitle, icon: Icon, color = 'blue', onClick }) => {
  const iconBg = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    cyan: 'bg-sky-50 text-sky-600 border-sky-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold font-sans uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl border ${iconBg[color]} shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold font-sans text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      {subtitle && <p className="text-xs font-sans text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};
