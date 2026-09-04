import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      default: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-700',
      danger: 'border-rose-200 bg-rose-50 text-rose-700',
      neutral: 'border-slate-200 bg-slate-50 text-slate-600',
      gold: 'border-amber-200 bg-amber-50 text-amber-700',
    },
  },
  defaultVariants: { variant: 'default' },
});

const dotVariants: Record<string, string> = {
  default: 'bg-emerald-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  danger: 'bg-rose-600',
  neutral: 'bg-slate-400',
  gold: 'bg-amber-500',
};

export function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotVariants[variant ?? 'default'])} />}
      {children}
    </span>
  );
}

export const CLIENT_STATUS_MAP: Record<string, { label: string; variant: any }> = {
  GRACE_PERIOD: { label: 'Em Carência', variant: 'warning' },
  ACTIVE: { label: 'Activo', variant: 'success' },
  SUSPENDED: { label: 'Suspenso', variant: 'danger' },
  TERMINATED: { label: 'Rescindido', variant: 'neutral' },
  DECEASED: { label: 'Falecido(a)', variant: 'neutral' },
};

const CONTRACT_STATUS_MAP: Record<string, { label: string; variant: any }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  SUSPENDED: { label: 'Suspenso', variant: 'danger' },
  TERMINATED: { label: 'Rescindido', variant: 'neutral' },
  CANCELLED: { label: 'Cancelado', variant: 'neutral' },
  FULFILLED: { label: 'Concluído (Sinistro)', variant: 'neutral' },
};

const CLAIM_STATUS_MAP: Record<string, { label: string; variant: any }> = {
  REQUESTED: { label: 'Pedido Pendente', variant: 'warning' },
  REGISTERED: { label: 'Confirmado', variant: 'success' },
  REJECTED: { label: 'Rejeitado', variant: 'danger' },
  CANCELLED: { label: 'Anulado', variant: 'neutral' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: any }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  COMPLETED: { label: 'Concluído', variant: 'success' },
  FAILED: { label: 'Falhou', variant: 'danger' },
  REFUNDED: { label: 'Reembolsado', variant: 'neutral' },
};

const INSTALLMENT_STATUS_MAP: Record<string, { label: string; variant: any }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  PAID: { label: 'Pago', variant: 'success' },
  LATE: { label: 'Atrasado', variant: 'danger' },
  WAIVED: { label: 'Isento', variant: 'neutral' },
};

export function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; variant: any }> }) {
  const entry = map[status] ?? { label: status, variant: 'neutral' };
  return (
    <Badge variant={entry.variant} dot>
      {entry.label}
    </Badge>
  );
}

export const ClientStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} map={CLIENT_STATUS_MAP} />
);
export const ContractStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} map={CONTRACT_STATUS_MAP} />
);
export const PaymentStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} map={PAYMENT_STATUS_MAP} />
);
export const InstallmentStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} map={INSTALLMENT_STATUS_MAP} />
);
export const ClaimStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} map={CLAIM_STATUS_MAP} />
);
