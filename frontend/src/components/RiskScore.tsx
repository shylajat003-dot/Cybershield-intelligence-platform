import React from 'react';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskScore: React.FC<Props> = ({ score, size = 'md', showLabel = true }) => {
  const getRiskDetails = (val: number) => {
    if (val >= 76) return { color: 'text-red-400 bg-red-500/20 border-red-500/30', bar: 'bg-red-500', label: 'CRITICAL' };
    if (val >= 51) return { color: 'text-orange-400 bg-orange-500/20 border-orange-500/30', bar: 'bg-orange-500', label: 'HIGH' };
    if (val >= 26) return { color: 'text-amber-400 bg-amber-500/20 border-amber-500/30', bar: 'bg-amber-500', label: 'MEDIUM' };
    return { color: 'text-green-400 bg-green-500/20 border-green-500/30', bar: 'bg-green-500', label: 'LOW' };
  };

  const details = getRiskDetails(score);

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono font-bold text-xs ${details.color}`}>
        {score} / 100
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full max-w-xs">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-slate-400">Risk Score</span>
        <span className={`font-bold ${details.color.split(' ')[0]}`}>
          {score} / 100 {showLabel && `(${details.label})`}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div
          className={`h-full transition-all duration-500 ${details.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
};
