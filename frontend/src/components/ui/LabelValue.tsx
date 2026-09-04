import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Par label/valor para painéis de leitura (dados do cliente, resumo do contrato, etc).
 * O peso da hierarquia vem do tamanho/cor, não de negrito no valor — mantém a página legível
 * mesmo quando várias dezenas destes pares aparecem juntos.
 */
export function LabelValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
