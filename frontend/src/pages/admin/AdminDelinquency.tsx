import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Phone, RotateCcw } from 'lucide-react';
import { ContractsApi, DashboardApi, NotificationsApi } from '@/api/endpoints';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ClientStatusBadge, InstallmentStatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/api/client';
import { formatDate, formatMoney } from '@/lib/utils';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PAGE_SIZE = 10;

export default function AdminDelinquency() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [page, setPage] = useState(1);
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['delinquency', month, year],
    queryFn: () => DashboardApi.delinquency(month, year),
  });

  const totalPages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paginatedRows = rows?.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const remindMutation = useMutation({
    mutationFn: (installmentId: string) => NotificationsApi.remind(installmentId),
    onSuccess: (_data, installmentId) => {
      const row = rows?.find((r) => r.installmentId === installmentId);
      push('success', `Lembrete de cobrança enviado para ${row?.clientPhone ?? 'o cliente'}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-contract-notifications'] });
    },
    onError: (err: any) => {
      push('error', err?.response?.data?.message ?? 'Não foi possível enviar o lembrete.');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (contractId: string) => ContractsApi.reactivate(contractId),
    onSuccess: () => {
      push('success', 'Contrato reactivado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['delinquency', month, year] });
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível reactivar o contrato.')),
  });

  const totalDue = rows?.reduce((sum, r) => sum + r.totalDue, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Relatório de Inadimplência"
        description="Clientes com prestações pendentes ou em atraso, filtrado por mês e ano."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="w-48" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
        <Select className="w-32" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        {!isLoading && rows && (
          <span className="text-sm text-slate-500">
            {rows.length} clientes em atraso · Total em falta: <strong>{formatMoney(totalDue)}</strong>
          </span>
        )}
      </div>

      <Table
        footer={
          !isLoading &&
          !!rows?.length && (
            <Pagination page={pageClamped} totalPages={totalPages} totalItems={rows.length} pageSize={PAGE_SIZE} onChange={setPage} />
          )
        }
      >
        <THead>
          <TR>
            <TH>Cliente</TH>
            <TH>Contrato</TH>
            <TH>Plano</TH>
            <TH>Vencimento</TH>
            <TH>Valor + Mora</TH>
            <TH>Estado Mensalidade</TH>
            <TH>Estado Cliente</TH>
            <TH>Acções</TH>
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
            paginatedRows?.map((r) => (
              <TR key={r.installmentId}>
                <TD>
                  <Link to={`/admin/clientes/${r.clientId}`} className="font-medium text-emerald-800 hover:underline">
                    {r.clientName}
                  </Link>
                  <p className="text-xs text-slate-400">{r.clientCode}</p>
                </TD>
                <TD>{r.contractNumber}</TD>
                <TD>{r.planName}</TD>
                <TD>{formatDate(r.dueDate)}</TD>
                <TD className="font-medium">{formatMoney(r.totalDue)}</TD>
                <TD>
                  <InstallmentStatusBadge status={r.status} />
                </TD>
                <TD>
                  <ClientStatusBadge status={r.clientStatus} />
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={remindMutation.isPending && remindMutation.variables === r.installmentId}
                      onClick={() => remindMutation.mutate(r.installmentId)}
                    >
                      <Phone className="h-3 w-3" /> Notificar
                    </Button>
                    {r.contractStatus === 'SUSPENDED' && user?.role === 'ADMIN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={reactivateMutation.isPending && reactivateMutation.variables === r.contractId}
                        onClick={() => reactivateMutation.mutate(r.contractId)}
                      >
                        <RotateCcw className="h-3 w-3" /> Reactivar
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {!isLoading && rows?.length === 0 && <EmptyState message="Nenhum cliente em atraso neste período. 🎉" />}
    </div>
  );
}
