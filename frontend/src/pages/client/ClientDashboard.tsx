import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CreditCard, FileText, ShieldCheck, Users, Wallet } from 'lucide-react';
import { PortalApi, DocumentsApi } from '@/api/endpoints';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClientStatusBadge, ContractStatusBadge, InstallmentStatusBadge } from '@/components/ui/Badge';
import { MobileMoneyPaymentModal } from '@/components/payments/MobileMoneyPaymentModal';
import { currentMonthReference, formatDate, formatMoney } from '@/lib/utils';
import { LabelValue as InfoBlock } from '@/components/ui/LabelValue';
import { usePendingAction } from '@/hooks/usePendingAction';

export default function ClientDashboard() {
  const { data: client, isLoading } = useQuery({ queryKey: ['portal-overview'], queryFn: PortalApi.overview });
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const { isPending, run } = usePendingAction();

  if (isLoading || !client) {
    return <p className="text-slate-500">A carregar...</p>;
  }

  const contract = client.contracts?.[0];
  // Só é exigível a mensalidade do mês corrente ou de meses já passados — nunca uma futura.
  const nextInstallment = contract?.installments?.find(
    (i) => (i.status === 'PENDING' || i.status === 'LATE') && i.monthReference <= currentMonthReference(),
  );

  const graceDaysLeft = contract?.gracePeriodEnd
    ? Math.max(0, Math.ceil((new Date(contract.gracePeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const pendingLabel = !contract?.membershipFeePaid
    ? `Taxa de Adesão: ${formatMoney(contract?.membershipFeeAmount ?? 0)}`
    : nextInstallment
      ? `Mensalidade ${nextInstallment.monthReference}: ${formatMoney(Number(nextInstallment.amount) + Number(nextInstallment.lateFee))}`
      : null;

  return (
    <div>
      <PageHeader title={`Olá, ${client.fullName.split(' ')[0]}`} description={`Código de cliente: ${client.clientCode}`} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Estado da Conta</p>
              <ClientStatusBadge status={client.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Carência</p>
              <p className="font-semibold text-slate-900">
                {graceDaysLeft === null ? '-' : graceDaysLeft === 0 ? 'Concluída' : `${graceDaysLeft} dias restantes`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Dependentes</p>
              <p className="font-semibold text-slate-900">{client.dependents?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {contract && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Plano Contratado: {contract.plan.displayName}</CardTitle>
              <p className="text-sm text-slate-500">Contrato nº {contract.contractNumber}</p>
            </div>
            <ContractStatusBadge status={contract.status} />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBlock label="Prestação" value={formatMoney(contract.installmentAmount)} />
            <InfoBlock label="Frequência" value={contract.paymentFrequency} />
            <InfoBlock label="Duração" value={`${contract.durationMonths} meses`} />
            <InfoBlock label="Início" value={formatDate(contract.startDate)} />
          </CardContent>

          {pendingLabel && (
            <CardContent className="border-t border-slate-100 bg-amber-50/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Wallet className="h-4 w-4" /> Pendente: <strong>{pendingLabel}</strong>
                </div>
                <Button onClick={() => setPayOpen(true)}>
                  <CreditCard className="h-4 w-4" /> Efectuar Pagamento
                </Button>
              </div>
            </CardContent>
          )}

          <CardContent className="flex flex-wrap gap-3 border-t border-slate-100">
            <Button
              variant="outline"
              loading={isPending('contract')}
              onClick={() => run('contract', () => DocumentsApi.openContractPdf(contract.id))}
            >
              <FileText className="h-4 w-4" /> Ver Contrato (PDF)
            </Button>
            <Button
              variant="outline"
              loading={isPending('adhesion')}
              onClick={() => run('adhesion', () => DocumentsApi.openAdhesionPdf(contract.id))}
            >
              <FileText className="h-4 w-4" /> Ver Ficha de Adesão (PDF)
            </Button>
          </CardContent>
        </Card>
      )}

      {contract?.installments && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Próximas Mensalidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contract.installments.slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm last:border-0">
                <span className="text-slate-600">{i.monthReference} · vencimento {formatDate(i.dueDate)}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">{formatMoney(Number(i.amount) + Number(i.lateFee))}</span>
                  <InstallmentStatusBadge status={i.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {contract && (
        <MobileMoneyPaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          contractId={contract.id}
          installmentId={contract.membershipFeePaid ? nextInstallment?.id : undefined}
          amountLabel={pendingLabel ?? ''}
          defaultPhone={client.phone}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['portal-overview'] })}
        />
      )}
    </div>
  );
}

