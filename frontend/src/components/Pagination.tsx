import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination as PaginationType } from '../types';

interface Props {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<Props> = ({ pagination, onPageChange }) => {
  const { page, totalPages, total, limit } = pagination;
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 font-mono">
      <div>
        Showing <span className="font-semibold text-slate-900">{start}</span> to{' '}
        <span className="font-semibold text-slate-900">{end}</span> of{' '}
        <span className="font-semibold text-slate-900">{total}</span> records
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-slate-700 px-2 font-medium">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};


