import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  iconColor?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 mb-6">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`p-2.5 bg-slate-100 rounded-xl border border-slate-200 ${iconColor} shrink-0 mt-0.5 shadow-xs`}>
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm font-sans text-slate-500 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
