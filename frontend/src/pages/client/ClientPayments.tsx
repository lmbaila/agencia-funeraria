import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { DocumentsApi, PortalApi } from '@/api/endpoints';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { usePendingAction } from '@/hooks/usePendingAction';

const METHOD_LABEL: Record<string, string> = {
  MPESA: 'M-Pesa',
  EMOLA: 'e-Mola',
  CASH: 'Dinheiro (balcão)',
  POS: 'POS (balcão)',
  BANK_TRANSFER: 'Transferência BCI',
};

export default function ClientPayments() {
  const { data: overview } = useQuery({ queryKey: ['portal-overview'], queryFn: PortalApi.overview });
  const contract = overview?.contracts?.[0];

  const { data: payments, isLoading } = useQuery({
    queryKey: ['portal-payments', contract?.id],
    queryFn: () => PortalApi.payments(contract!.id),
    enabled: !!contract,
  });

  const { isPending, run } = usePendingAction();

  return (
    <div>
      <PageHeader title="Histórico de Pagamentos" description="Todos os pagamentos realizados no seu contrato." />

      <Table>
        <THead>
          <TR>
            <TH>Data</TH>
            <TH>Tipo</TH>
            <TH>Mês Referente</TH>
            <TH>Método</TH>
            <TH>Referência</TH>
            <TH>Valor</TH>
            <TH>Estado</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {isLoading ? (
            <TR>
              <TD colSpan={8} className="text-center text-slate-400">
                A carregar...
              </TD>
            </TR>
          ) : (
            payments?.map((p) => (
              <TR key={p.id}>
                <TD>{formatDateTime(p.paidAt ?? p.createdAt)}</TD>
                <TD>{p.type === 'MEMBERSHIP_FEE' ? 'Taxa de Adesão' : 'Mensalidade'}</TD>
                <TD>{p.monthReference ?? '-'}</TD>
                <TD>{METHOD_LABEL[p.method] ?? p.method}</TD>
                <TD className="font-mono text-xs">{p.reference}</TD>
                <TD className="font-medium">{formatMoney(p.amount)}</TD>
                <TD>
                  <PaymentStatusBadge status={p.status} />
                </TD>
                <TD className="text-right">
                  {p.status === 'COMPLETED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={isPending(p.id)}
                      onClick={() => run(p.id, () => DocumentsApi.openReceiptPdf(p.id))}
                    >
                      <FileText className="h-4 w-4" /> Recibo
                    </Button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {!isLoading && payments?.length === 0 && <EmptyState message="Ainda não existem pagamentos registados." />}
    </div>
  );
}
