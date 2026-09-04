import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({
  className,
  footer,
  ...props
}: HTMLAttributes<HTMLTableElement> & { footer?: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm', className)} {...props} />
      </div>
      {footer}
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-slate-200 bg-slate-50/80 text-left', className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={className} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-slate-50/70', className)} {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500', className)}
      {...props}
    />
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-slate-100 px-4 py-3.5 align-middle text-slate-700 last:border-0', className)} {...props} />
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{message}</div>;
}
