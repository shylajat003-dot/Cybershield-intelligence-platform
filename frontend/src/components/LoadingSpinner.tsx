import React from 'react';

interface Props {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<Props> = ({ text = 'Loading SOC telemetry...', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-400">
      <div className={`rounded-full border-blue-500/20 border-t-blue-500 animate-spin ${sizeMap[size]}`} />
      {text && <p className="text-xs font-mono text-slate-400 tracking-wide animate-pulse">{text}</p>}
    </div>
  );
};
