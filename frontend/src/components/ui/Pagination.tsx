import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        {start}–{end} de {totalItems}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1 text-xs text-slate-500">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
