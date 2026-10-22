import React from 'react';
import { ShieldAlert, Plus } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({
  title = 'No security items found',
  description = 'There are currently no records matching your selected query or filters.',
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-soc-card/50 border border-dashed border-soc-border rounded-xl">
      <div className="p-3 bg-white border border-slate-200 rounded-full text-slate-500 mb-3">
        <ShieldAlert size={28} />
      </div>
      <h3 className="text-sm font-semibold text-slate-200 font-mono">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          {actionText}
        </button>
      )}
    </div>
  );
};

