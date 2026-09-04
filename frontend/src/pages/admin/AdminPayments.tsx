import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { DocumentsApi, PaymentsApi } from '@/api/endpoints';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS as METHOD_LABEL } from '@/lib/labels';
import { usePendingAction } from '@/hooks/usePendingAction';

const PAGE_SIZE = 10;

export default function AdminPayments() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { isPending, run } = usePendingAction();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', month, status],
    queryFn: () => PaymentsApi.listAll(month || undefined, status || undefined),
  });

  const totalItems = payments?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paginatedPayments = (payments ?? []).slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Pagamentos" description="Todos os pagamentos registados no sistema (móveis e presenciais)." />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(1);
          }}
          className="w-48"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-52"
        >
          <option value="">Todos os estados</option>
          <option value="PENDING">Pendente</option>
          <option value="COMPLETED">Concluído</option>
          <option value="FAILED">Falhou</option>
        </Select>
      </div>

      <Table
        footer={
          !isLoading &&
          totalItems > 0 && (
            <Pagination page={pageClamped} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onChange={setPage} />
          )
        }
      >
        <THead>
          <TR>
            <TH>Data</TH>
            <TH>Cliente</TH>
            <TH>Tipo</TH>
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
            paginatedPayments.map((p) => (
              <TR key={p.id}>
                <TD>{formatDateTime(p.paidAt ?? p.createdAt)}</TD>
                <TD>
                  {p.contract?.client ? (
                    <Link to={`/admin/clientes/${p.contract.client.id}`} className="text-emerald-800 hover:underline">
                      {p.contract.client.fullName}
                    </Link>
                  ) : (
                    '-'
                  )}
                </TD>
                <TD>{p.type === 'MEMBERSHIP_FEE' ? 'Taxa de Adesão' : 'Mensalidade'}</TD>
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
      {!isLoading && payments?.length === 0 && <EmptyState message="Nenhum pagamento encontrado para este período." />}
    </div>
  );
}
