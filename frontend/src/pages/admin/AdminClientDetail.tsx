import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  FileSignature,
  FileText,
  FileWarning,
  IdCard,
  KeyRound,
  Link2,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Smartphone,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  ClaimsApi,
  ClientsApi,
  ContractsApi,
  DocumentsApi,
  NotificationsApi,
  PaymentLinksApi,
  PaymentsApi,
  PublicClaimsApi,
  SettingsApi,
  UploadsApi,
  type UploadedDocument,
} from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Select, Textarea } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { LabelValue as Info } from '@/components/ui/LabelValue';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { PasswordConfirmDialog } from '@/components/ui/PasswordConfirmDialog';
import { FileUploadField } from '@/components/ui/FileUploadField';
import { ClaimStatusBadge, ClientStatusBadge, ContractStatusBadge, InstallmentStatusBadge } from '@/components/ui/Badge';
import { ManualPaymentModal } from '@/components/payments/ManualPaymentModal';
import { MobileMoneyPaymentModal } from '@/components/payments/MobileMoneyPaymentModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { currentMonthReference, formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import { dependentBirthDateError, relationshipAlreadyTaken, relationshipLimitMessage } from '@/lib/dependents';
import { MARITAL_STATUS_LABELS, PAYMENT_FREQUENCY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/labels';
import { usePendingAction } from '@/hooks/usePendingAction';
import type { Claim, Dependent, Installment } from '@/types';

/** Só é possível cobrar mensalidades do mês corrente ou de meses já passados — nunca de meses futuros. */
const isCollectible = (i: Installment) =>
  (i.status === 'PENDING' || i.status === 'LATE') && i.monthReference <= currentMonthReference();

interface PayTarget {
  installmentId?: string;
  membershipFeePending: boolean;
  amountLabel: string;
}

interface LedgerRow {
  kind: 'FEE' | 'INSTALLMENT';
  key: string;
  typeLabel: string;
  month: string | null;
  dueDate: string;
  amount: number;
  lateFee: number;
  status: string;
  method?: string;
  paidAt?: string;
  paymentId?: string;
  installment?: Installment;
}

const PAGE_SIZE = 10;

const TERMINATION_REASONS = [
  'Pedido do cliente',
  'Incumprimento de pagamentos',
  'Erro de registo do contrato',
  'Mudança de plano',
  'Outro',
];

/** Frase adicional a mostrar ao concluir o contrato pelo óbito do titular, avisando durante
 * quanto tempo os dependentes cobertos ainda podem ter o óbito comunicado. */
function dependentsCoverageWindowNote(dependentsCount: number, windowMonths: number | undefined): string {
  if (dependentsCount === 0 || windowMonths === undefined) return '';
  const who = dependentsCount === 1 ? 'O dependente coberto ainda pode' : `Os ${dependentsCount} dependentes cobertos ainda podem`;
  if (windowMonths === 0) return ` ${who} ter o óbito comunicado apenas no momento desta confirmação.`;
  const when = windowMonths === 1 ? 'no próximo mês' : `nos próximos ${windowMonths} meses`;
  return ` ${who} ter o óbito comunicado ${when}.`;
}

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const { user } = useAuth();
  const canManageClaims = user?.role === 'ADMIN' || !!user?.permissions?.includes('MANAGE_CLAIMS');
  const canDeleteDependents = user?.role === 'ADMIN' || !!user?.permissions?.includes('DELETE_DEPENDENTS');
  const canExtendContracts = user?.role === 'ADMIN' || !!user?.permissions?.includes('EXTEND_CONTRACTS');
  const canTerminateContracts = user?.role === 'ADMIN' || !!user?.permissions?.includes('TERMINATE_CONTRACTS');
  const { isPending: isPdfPending, run: runPdf } = usePendingAction();
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({ beneficiary: '', dateOfDeath: '', notes: '' });
  const [claimDeathCertificate, setClaimDeathCertificate] = useState<UploadedDocument | null>(null);
  const [rejectClaimId, setRejectClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmClaimTarget, setConfirmClaimTarget] = useState<Claim | null>(null);
  const [confirmDeathCertificate, setConfirmDeathCertificate] = useState<UploadedDocument | null>(null);
  const [manualTarget, setManualTarget] = useState<PayTarget | null>(null);
  const [mobileMoneyTarget, setMobileMoneyTarget] = useState<PayTarget | null>(null);
  const [paymentLink, setPaymentLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendMonths, setExtendMonths] = useState('');
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateConfirmOpen, setTerminateConfirmOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateReasonOther, setTerminateReasonOther] = useState('');
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [editingDependentId, setEditingDependentId] = useState<string | null>(null);
  const [depForm, setDepForm] = useState({ firstName: '', lastName: '', relationship: '', birthDate: '' });
  const [resetCredentials, setResetCredentials] = useState<{ identifier: string; password: string } | null>(null);

  const [ledgerMonthFilter, setLedgerMonthFilter] = useState('UPTO_CURRENT');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('ALL');
  const [ledgerPage, setLedgerPage] = useState(1);

  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => ClientsApi.get(id!),
    enabled: !!id,
  });

  const { data: systemSettings } = useQuery({ queryKey: ['system-settings'], queryFn: SettingsApi.get });

  const contract = client?.contracts?.[0];

  const { data: payments } = useQuery({
    queryKey: ['admin-contract-payments', contract?.id],
    queryFn: () => PaymentsApi.listForContract(contract!.id),
    enabled: !!contract,
  });

  const { data: claims } = useQuery({
    queryKey: ['admin-contract-claims', contract?.id],
    queryFn: () => ClaimsApi.listForContract(contract!.id),
    enabled: !!contract,
  });

  const { data: notifications } = useQuery({
    queryKey: ['admin-contract-notifications', contract?.id],
    queryFn: () => NotificationsApi.listForContract(contract!.id),
    enabled: !!contract,
  });

  const installments = contract?.installments ?? [];
  const paymentsList = payments ?? [];

  // Uma única lista de cobranças (taxa de adesão + mensalidades), cada uma já ligada ao respectivo
  // pagamento (método/data) quando existe — evita repetir a mesma informação em duas tabelas.
  const ledgerRows: LedgerRow[] = useMemo(() => {
    if (!contract) return [];
    const rows: LedgerRow[] = [];

    const feePayment = paymentsList.find((p) => p.type === 'MEMBERSHIP_FEE' && p.status === 'COMPLETED');
    rows.push({
      kind: 'FEE',
      key: 'membership-fee',
      typeLabel: 'Taxa de Adesão',
      month: null,
      dueDate: contract.startDate,
      amount: Number(contract.membershipFeeAmount),
      lateFee: 0,
      status: contract.membershipFeePaid ? 'PAID' : 'PENDING',
      method: feePayment?.method,
      paidAt: feePayment?.paidAt ?? contract.membershipFeePaidAt ?? undefined,
      paymentId: feePayment?.id,
    });

    for (const i of installments) {
      const pay = paymentsList.find(
        (p) => p.type === 'INSTALLMENT' && p.monthReference === i.monthReference && p.status === 'COMPLETED',
      );
      rows.push({
        kind: 'INSTALLMENT',
        key: i.id,
        typeLabel: 'Mensalidade',
        month: i.monthReference,
        dueDate: i.dueDate,
        amount: Number(i.amount),
        lateFee: Number(i.lateFee ?? 0),
        status: i.status,
        method: pay?.method,
        paidAt: pay?.paidAt ?? undefined,
        paymentId: pay?.id,
        installment: i,
      });
    }

    return rows;
  }, [contract, installments, paymentsList]);

  const uniqueLedgerMonths = useMemo(
    () => Array.from(new Set(ledgerRows.map((r) => r.month).filter((m): m is string => !!m))).sort(),
    [ledgerRows],
  );

  const filteredLedgerRows = useMemo(
    () =>
      ledgerRows.filter((r) => {
        if (ledgerStatusFilter !== 'ALL' && r.status !== ledgerStatusFilter) return false;
        if (r.kind === 'FEE') return true; // a taxa de adesão não está associada a um mês, é sempre mostrada
        if (ledgerMonthFilter === 'UPTO_CURRENT') {
          // "Efectuadas" (já pagas/isentas) aparecem sempre; as restantes só se já venceram.
          return r.status === 'PAID' || r.status === 'WAIVED' || (r.month as string) <= currentMonthReference();
        }
        if (ledgerMonthFilter === 'ALL') return true;
        return r.month === ledgerMonthFilter;
      }),
    [ledgerRows, ledgerMonthFilter, ledgerStatusFilter],
  );
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedgerRows.length / PAGE_SIZE));
  const ledgerPageClamped = Math.min(ledgerPage, ledgerTotalPages);
  const paginatedLedgerRows = filteredLedgerRows.slice(
    (ledgerPageClamped - 1) * PAGE_SIZE,
    ledgerPageClamped * PAGE_SIZE,
  );

  const closeDepModal = () => {
    setDepModalOpen(false);
    setEditingDependentId(null);
    setDepForm({ firstName: '', lastName: '', relationship: '', birthDate: '' });
  };

  const startEditDependent = (d: Dependent) => {
    const [firstName, ...rest] = d.fullName.split(' ');
    setDepForm({ firstName, lastName: rest.join(' '), relationship: d.relationship, birthDate: d.birthDate?.slice(0, 10) ?? '' });
    setEditingDependentId(d.id);
    setDepModalOpen(true);
  };

  const addDependentMutation = useMutation({
    mutationFn: () => ClientsApi.addDependent(id!, depForm),
    onSuccess: () => {
      push('success', 'Dependente adicionado.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      closeDepModal();
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const updateDependentMutation = useMutation({
    mutationFn: () => ClientsApi.updateDependent(id!, editingDependentId!, depForm),
    onSuccess: () => {
      push('success', 'Dependente actualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      closeDepModal();
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const [removeDepTarget, setRemoveDepTarget] = useState<Dependent | null>(null);
  const removeDependentMutation = useMutation({
    mutationFn: (depId: string) => ClientsApi.removeDependent(id!, depId),
    onSuccess: () => {
      push('success', 'Dependente removido.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      setRemoveDepTarget(null);
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível remover o dependente.')),
  });

  const confirmFeeMutation = useMutation({
    mutationFn: () => ContractsApi.confirmMembershipFee(contract!.id),
    onSuccess: () => {
      push('success', 'Taxa de adesão confirmada. Carência iniciada.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const extendMutation = useMutation({
    mutationFn: (months: number) => ContractsApi.extend(contract!.id, months),
    onSuccess: (res) => {
      push('success', 'Contrato prorrogado com sucesso. O cliente foi notificado.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      setExtendModalOpen(false);
      setExtendMonths('');
      DocumentsApi.openExtensionAddendumPdf(res.addendumId);
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const createLinkMutation = useMutation({
    mutationFn: (installmentId?: string) => PaymentLinksApi.create(contract!.id, installmentId),
    onSuccess: (res) => setPaymentLink(res),
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível gerar o link de pagamento.')),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => ContractsApi.reactivate(contract!.id),
    onSuccess: () => {
      push('success', 'Contrato reactivado.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível reactivar o contrato.')),
  });

  const terminateReasonFinal = terminateReason === 'Outro' ? terminateReasonOther.trim() : terminateReason;
  const terminateMutation = useMutation({
    mutationFn: () => ContractsApi.terminate(contract!.id, terminateReasonFinal),
    onSuccess: () => {
      push('success', 'Contrato rescindido.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      setTerminateConfirmOpen(false);
      setTerminateModalOpen(false);
      setTerminateReason('');
      setTerminateReasonOther('');
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível rescindir o contrato.')),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => ClientsApi.resetPassword(id!),
    onSuccess: (res) => setResetCredentials({ identifier: client!.clientCode, password: res.temporaryPassword }),
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível repor a password.')),
  });

  const closeClaimModal = () => {
    setClaimModalOpen(false);
    setClaimForm({ beneficiary: '', dateOfDeath: '', notes: '' });
    setClaimDeathCertificate(null);
  };

  const createClaimMutation = useMutation({
    mutationFn: () => {
      const certificate = {
        deathCertificatePath: claimDeathCertificate?.path,
        deathCertificateMimeType: claimDeathCertificate?.mimeType,
      };
      const dto =
        claimForm.beneficiary === 'CLIENT'
          ? { beneficiaryType: 'CLIENT' as const, dateOfDeath: claimForm.dateOfDeath, notes: claimForm.notes || undefined, ...certificate }
          : {
              beneficiaryType: 'DEPENDENT' as const,
              dependentId: claimForm.beneficiary,
              dateOfDeath: claimForm.dateOfDeath,
              notes: claimForm.notes || undefined,
              ...certificate,
            };
      return ClaimsApi.create(contract!.id, dto);
    },
    onSuccess: () => {
      push('success', 'Sinistro registado.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-contract-claims', contract?.id] });
      closeClaimModal();
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível registar o sinistro.')),
  });

  const confirmClaimMutation = useMutation({
    mutationFn: (claimId: string) =>
      ClaimsApi.confirm(claimId, {
        deathCertificatePath: confirmDeathCertificate?.path,
        deathCertificateMimeType: confirmDeathCertificate?.mimeType,
      }),
    onSuccess: () => {
      push('success', 'Sinistro confirmado: cobertura activada e Termo de Sinistro disponível.');
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-contract-claims', contract?.id] });
      setConfirmClaimTarget(null);
      setConfirmDeathCertificate(null);
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível confirmar o pedido.')),
  });

  const rejectClaimMutation = useMutation({
    mutationFn: () => ClaimsApi.reject(rejectClaimId!, rejectReason),
    onSuccess: () => {
      push('success', 'Pedido rejeitado.');
      queryClient.invalidateQueries({ queryKey: ['admin-contract-claims', contract?.id] });
      setRejectClaimId(null);
      setRejectReason('');
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível rejeitar o pedido.')),
  });

  if (isLoading || !client) return <p className="text-slate-500">A carregar...</p>;

  const membershipFeeTarget: PayTarget | null = contract
    ? { membershipFeePending: true, amountLabel: `${formatMoney(contract.membershipFeeAmount)} (Taxa de Adesão)` }
    : null;

  const installmentTarget = (i: Installment): PayTarget => ({
    installmentId: i.id,
    membershipFeePending: false,
    amountLabel: `${formatMoney(Number(i.amount) + Number(i.lateFee ?? 0))} (${i.monthReference})`,
  });

  const membershipFeeItems: ActionMenuItem[] = membershipFeeTarget
    ? [
        { label: 'Dar Baixa de Pagamento', icon: Wallet, onClick: () => setManualTarget(membershipFeeTarget) },
        { label: 'Cobrar via Carteira Móvel', icon: Smartphone, onClick: () => setMobileMoneyTarget(membershipFeeTarget) },
        { label: 'Enviar Link de Pagamento', icon: Link2, onClick: () => createLinkMutation.mutateAsync(undefined) },
        { label: 'Confirmar Recepção da Taxa de Adesão', icon: CheckCircle2, onClick: () => confirmFeeMutation.mutateAsync() },
      ]
    : [];

  const installmentItems = (i: Installment): ActionMenuItem[] => {
    const target = installmentTarget(i);
    return [
      { label: 'Dar Baixa de Pagamento', icon: Wallet, onClick: () => setManualTarget(target) },
      { label: 'Cobrar via Carteira Móvel', icon: Smartphone, onClick: () => setMobileMoneyTarget(target) },
      { label: 'Enviar Link de Pagamento', icon: Link2, onClick: () => createLinkMutation.mutateAsync(i.id) },
    ];
  };

  const claimEligibility: string | null = !contract
    ? 'Este cliente ainda não tem um contrato.'
    : contract.status === 'FULFILLED'
      ? (client.dependents ?? []).length === 0
        ? 'Já não há dependentes por comunicar neste contrato.'
        : null
      : contract.status !== 'ACTIVE'
        ? 'Só é possível registar um sinistro para um contrato activo.'
        : !contract.membershipFeePaid || !contract.gracePeriodEnd || new Date(contract.gracePeriodEnd) > new Date()
          ? 'O contrato ainda está no período de carência. O sinistro só pode ser registado depois de terminar.'
          : null;

  const activeDependents = client.dependents ?? [];
  const contractIsLocked = contract?.status === 'TERMINATED' || contract?.status === 'FULFILLED';

  // Última mensalidade já gerada — sem isto, o contrato continua "coberto" indefinidamente sem
  // gerar mais cobranças assim que as mensalidades se esgotarem, a menos que alguém repare.
  const lastInstallmentDueDate = contract?.installments?.length
    ? new Date(Math.max(...contract.installments.map((i) => new Date(i.dueDate).getTime())))
    : null;
  const daysUntilCoverageEnds = lastInstallmentDueDate
    ? Math.ceil((lastInstallmentDueDate.getTime() - Date.now()) / 86400000)
    : null;
  const showExtensionWarning = !!contract && !contractIsLocked && daysUntilCoverageEnds !== null && daysUntilCoverageEnds <= 60;

  return (
    <div>
      <PageHeader
        title={client.fullName}
        description={`Código: ${client.clientCode}`}
        action={<ClientStatusBadge status={client.status} />}
      />

      <Tabs
        tabs={[
          {
            key: 'overview',
            label: 'Visão Geral',
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Dados Pessoais e de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Info label="Nacionalidade" value={client.nationality} />
                  <Info label="Naturalidade" value={client.placeOfBirth} />
                  <Info label="Data de Nascimento" value={formatDate(client.birthDate)} />
                  <Info
                    label="Estado Civil"
                    value={client.maritalStatus ? MARITAL_STATUS_LABELS[client.maritalStatus] ?? client.maritalStatus : '-'}
                  />
                  <Info label="Telefone" value={`+258 ${client.phone}`} />
                  <Info label="Endereço" value={`${client.neighborhood}, ${client.district}, ${client.province}`} />
                </CardContent>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <IdCard className="h-4 w-4" />
                    {client.documentType} nº {client.documentNumber}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {client.documentImagePath ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isPdfPending('document-image')}
                        onClick={() => runPdf('document-image', () => DocumentsApi.openClientDocumentImage(client.id))}
                      >
                        <FileText className="h-4 w-4" /> Ver Documento Anexado
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Nenhum documento anexado</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPasswordMutation.mutate()}
                      loading={resetPasswordMutation.isPending}
                    >
                      <KeyRound className="h-4 w-4" /> Repor Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            key: 'dependents',
            label: `Dependentes (${client.dependents?.length ?? 0})`,
            content: (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Beneficiários</CardTitle>
                  <Button size="sm" onClick={() => setDepModalOpen(true)}>
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </CardHeader>
                {!client.dependents || client.dependents.length === 0 ? (
                  <EmptyState message="Nenhum dependente registado." />
                ) : (
                  <CardContent className="divide-y divide-slate-100 p-0">
                    {client.dependents.map((d: Dependent) => (
                      <div key={d.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <UserRound className="h-5 w-5 text-emerald-700" />
                          <div>
                            <p className="font-medium text-slate-900">{d.fullName}</p>
                            <p className="text-xs text-slate-500">{d.relationship}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditDependent(d)}>
                            <Pencil className="h-4 w-4 text-slate-400" />
                          </Button>
                          {canDeleteDependents && (
                            <Button variant="ghost" size="icon" onClick={() => setRemoveDepTarget(d)}>
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ),
          },
          {
            key: 'contract',
            label: 'Contrato',
            content: contract ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Contrato {contract.contractNumber}</CardTitle>
                    <p className="text-sm text-slate-500">{contract.plan.displayName}</p>
                  </div>
                  <ContractStatusBadge status={contract.status} />
                </CardHeader>
                {showExtensionWarning && (
                  <CardContent className="border-b border-amber-100 bg-amber-50/60 py-3 text-sm text-amber-800">
                    {daysUntilCoverageEnds! <= 0
                      ? `Este contrato já não tem mensalidades geradas desde ${formatDate(lastInstallmentDueDate!.toISOString())}. Prorrogue para manter a cobrança em curso.`
                      : `Este contrato só tem mensalidades geradas até ${formatDate(lastInstallmentDueDate!.toISOString())} (dentro de ${daysUntilCoverageEnds} dias). Considere prorrogá-lo.`}
                  </CardContent>
                )}
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Info
                    label="Prestação"
                    value={`${formatMoney(contract.installmentAmount)} · ${PAYMENT_FREQUENCY_LABELS[contract.paymentFrequency] ?? contract.paymentFrequency}`}
                  />
                  <Info label="Duração" value={`${contract.durationMonths} meses`} />
                  <Info label="Início" value={formatDate(contract.startDate)} />
                  <Info
                    label="Taxa de Adesão"
                    value={`${formatMoney(contract.membershipFeeAmount)} (${contract.membershipFeePaid ? 'Paga' : 'Pendente'})`}
                  />
                </CardContent>
                <CardContent className="flex flex-wrap gap-3 border-t border-slate-100">
                  <ActionMenu
                    label="Imprimir"
                    icon={Printer}
                    items={[
                      { label: 'Imprimir Contrato', icon: FileSignature, onClick: () => DocumentsApi.openContractPdf(contract.id) },
                      { label: 'Imprimir Ficha de Adesão', icon: FileText, onClick: () => DocumentsApi.openAdhesionPdf(contract.id) },
                    ]}
                  />
                  {canExtendContracts && !contractIsLocked && (
                    <Button variant="outline" onClick={() => setExtendModalOpen(true)}>
                      <CalendarClock className="h-4 w-4" /> Prorrogar Contrato
                    </Button>
                  )}
                  {canTerminateContracts && contract.status !== 'TERMINATED' && contract.status !== 'FULFILLED' && (
                    <Button variant="destructive" onClick={() => setTerminateModalOpen(true)}>
                      <XCircle className="h-4 w-4" /> Rescindir Contrato
                    </Button>
                  )}
                  {(contract.status === 'SUSPENDED' || contract.status === 'TERMINATED') && user?.role === 'ADMIN' && (
                    <Button
                      variant="outline"
                      onClick={() => reactivateMutation.mutate()}
                      loading={reactivateMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4" /> Reactivar Contrato
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <EmptyState message="Este cliente ainda não tem um contrato." />
            ),
          },
          {
            key: 'claims',
            label: `Sinistros${claims && claims.length > 0 ? ` (${claims.length})` : ''}`,
            content: (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sinistros</CardTitle>
                    <p className="text-sm text-slate-500">Registo de falecimento do titular ou de um dependente coberto.</p>
                  </div>
                  {contract && !claimEligibility && canManageClaims && (
                    <Button size="sm" onClick={() => setClaimModalOpen(true)}>
                      <FileWarning className="h-4 w-4" /> Registar Sinistro
                    </Button>
                  )}
                </CardHeader>
                {contract && claimEligibility && (
                  <CardContent className="border-t border-slate-100 bg-amber-50/60 text-sm text-amber-800">
                    {claimEligibility}
                  </CardContent>
                )}
                {!claims || claims.length === 0 ? (
                  <EmptyState message="Nenhum sinistro registado." />
                ) : (
                  <CardContent className="divide-y divide-slate-100 p-0">
                    {claims.map((c) => (
                      <div
                        key={c.id}
                        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${
                          c.status === 'REQUESTED' ? 'bg-amber-50/60' : ''
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {c.deceasedName}{' '}
                            <span className="font-normal text-slate-400">
                              ({c.beneficiaryType === 'CLIENT' ? 'Titular' : c.dependent?.relationship ?? 'Dependente'})
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Falecimento: {formatDate(c.dateOfDeath)} · Registado: {formatDate(c.createdAt)}
                            {c.status === 'CANCELLED' && c.cancelReason ? ` · Anulado: ${c.cancelReason}` : ''}
                            {c.status === 'REJECTED' && c.rejectionReason ? ` · Rejeitado: ${c.rejectionReason}` : ''}
                          </p>
                          {c.source === 'PUBLIC_REQUEST' && c.requesterName && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Comunicado online por <span className="font-medium">{c.requesterName}</span>
                              {c.requesterRelationship ? ` (${c.requesterRelationship})` : ''}
                              {c.requesterPhone ? ` · ${c.requesterPhone}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <ClaimStatusBadge status={c.status} />
                          {c.deathCertificatePath && c.status !== 'CANCELLED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={isPdfPending(`${c.id}-certificate`)}
                              onClick={() => runPdf(`${c.id}-certificate`, () => DocumentsApi.openClaimDeathCertificate(c.id))}
                            >
                              <FileText className="h-4 w-4" /> Certidão
                            </Button>
                          )}
                          {c.status === 'REGISTERED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={isPdfPending(c.id)}
                              onClick={() => runPdf(c.id, () => DocumentsApi.openClaimPdf(c.id))}
                            >
                              <FileText className="h-4 w-4" /> Termo
                            </Button>
                          )}
                          {(c.status === 'REQUESTED' || c.status === 'REJECTED') && c.requestBatchId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(PublicClaimsApi.comprovativoUrl(c.requestBatchId!), '_blank')}
                            >
                              <FileText className="h-4 w-4" /> Comprovativo
                            </Button>
                          )}
                          {c.status === 'REQUESTED' && canManageClaims && (
                            <>
                              <Button size="sm" onClick={() => setConfirmClaimTarget(c)}>
                                <CheckCircle2 className="h-4 w-4" /> Confirmar
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setRejectClaimId(c.id)}>
                                <XCircle className="h-4 w-4 text-rose-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ),
          },
          {
            key: 'payments',
            label: 'Pagamentos',
            content: (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Cobranças</h3>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      className="w-auto"
                      value={ledgerMonthFilter}
                      onChange={(e) => {
                        setLedgerMonthFilter(e.target.value);
                        setLedgerPage(1);
                      }}
                    >
                      <option value="UPTO_CURRENT">Até ao mês corrente</option>
                      <option value="ALL">Todos os meses</option>
                      {uniqueLedgerMonths.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                    <Select
                      className="w-auto"
                      value={ledgerStatusFilter}
                      onChange={(e) => {
                        setLedgerStatusFilter(e.target.value);
                        setLedgerPage(1);
                      }}
                    >
                      <option value="ALL">Todos os estados</option>
                      <option value="PENDING">Pendente</option>
                      <option value="LATE">Atrasado</option>
                      <option value="PAID">Pago</option>
                      <option value="WAIVED">Isento</option>
                    </Select>
                  </div>
                </div>
                <Table
                  footer={
                    <Pagination
                      page={ledgerPageClamped}
                      totalPages={ledgerTotalPages}
                      totalItems={filteredLedgerRows.length}
                      pageSize={PAGE_SIZE}
                      onChange={setLedgerPage}
                    />
                  }
                >
                  <THead>
                    <TR>
                      <TH>Tipo</TH>
                      <TH>Mês</TH>
                      <TH>Vencimento</TH>
                      <TH>Valor</TH>
                      <TH>Pagamento</TH>
                      <TH>Estado</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedLedgerRows.length === 0 ? (
                      <TR>
                        <TD colSpan={7} className="text-center text-slate-400">
                          Nenhuma cobrança encontrada para este filtro.
                        </TD>
                      </TR>
                    ) : (
                      paginatedLedgerRows.map((r) => (
                        <TR key={r.key}>
                          <TD>{r.typeLabel}</TD>
                          <TD>{r.month ?? '-'}</TD>
                          <TD>{formatDate(r.dueDate)}</TD>
                          <TD>
                            {formatMoney(r.amount)}
                            {r.lateFee > 0 && <span className="text-xs text-slate-400"> (+{formatMoney(r.lateFee)} mora)</span>}
                          </TD>
                          <TD>
                            {r.method ? (
                              <>
                                {PAYMENT_METHOD_LABELS[r.method] ?? r.method}
                                {r.paidAt && <span className="text-xs text-slate-400"> · {formatDateTime(r.paidAt)}</span>}
                              </>
                            ) : (
                              '-'
                            )}
                          </TD>
                          <TD>
                            <InstallmentStatusBadge status={r.status} />
                          </TD>
                          <TD className="text-right">
                            {r.kind === 'FEE' ? (
                              r.status === 'PENDING' && !contractIsLocked ? (
                                <ActionMenu label="Cobrar" icon={Wallet} variant="outline" items={membershipFeeItems} />
                              ) : r.paymentId ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={isPdfPending(r.paymentId!)}
                                  onClick={() => runPdf(r.paymentId!, () => DocumentsApi.openReceiptPdf(r.paymentId!))}
                                >
                                  <FileText className="h-4 w-4" /> Recibo
                                </Button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )
                            ) : r.installment && isCollectible(r.installment) && !contractIsLocked ? (
                              <ActionMenu label="Cobrar" icon={Wallet} variant="outline" items={installmentItems(r.installment)} />
                            ) : r.status === 'PENDING' || r.status === 'LATE' ? (
                              <span className="text-xs text-slate-400">Vence em {r.month}</span>
                            ) : r.paymentId ? (
                              <Button variant="outline" size="sm" onClick={() => DocumentsApi.openReceiptPdf(r.paymentId!)}>
                                <FileText className="h-4 w-4" /> Recibo
                              </Button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>

                {notifications && notifications.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Lembretes de Cobrança Enviados</h3>
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div key={n.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-700">
                              {n.channel === 'SMS' ? 'SMS' : 'WhatsApp'} · {n.phone}
                            </span>
                            <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-slate-600">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {contract && (
        <>
          <ManualPaymentModal
            open={!!manualTarget}
            onClose={() => setManualTarget(null)}
            contractId={contract.id}
            installmentId={manualTarget?.installmentId}
            membershipFeePending={manualTarget?.membershipFeePending ?? false}
            amountLabel={manualTarget?.amountLabel ?? ''}
          />
          <MobileMoneyPaymentModal
            open={!!mobileMoneyTarget}
            onClose={() => setMobileMoneyTarget(null)}
            contractId={contract.id}
            installmentId={mobileMoneyTarget?.installmentId}
            amountLabel={mobileMoneyTarget?.amountLabel ?? ''}
            defaultPhone={client.phone}
            title="Cobrar via Carteira Móvel"
            initiate={PaymentsApi.initiateMobileMoneyStaff}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-client', id] })}
          />
        </>
      )}

      {resetCredentials && (
        <CredentialsModal
          open={!!resetCredentials}
          onClose={() => setResetCredentials(null)}
          title="Password reposta"
          description="Partilhe estas credenciais com o cliente. A password é temporária e terá de ser alterada no próximo acesso."
          identifier={resetCredentials.identifier}
          password={resetCredentials.password}
        />
      )}

      <PasswordConfirmDialog
        open={!!removeDepTarget}
        onClose={() => setRemoveDepTarget(null)}
        onConfirmed={() => removeDependentMutation.mutate(removeDepTarget!.id)}
        title="Remover dependente"
        description={`Introduza a sua password para confirmar a remoção de "${removeDepTarget?.fullName ?? ''}" da lista de beneficiários.`}
        confirmLabel="Remover Dependente"
        loading={removeDependentMutation.isPending}
      />

      <Modal open={!!paymentLink} onClose={() => setPaymentLink(null)} title="Link de Pagamento Gerado">
        {paymentLink && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Partilhe este link com o cliente (SMS, WhatsApp, etc.) para que ele conclua o pagamento via M-Pesa ou
              e-Mola. O link expira em {formatDateTime(paymentLink.expiresAt)}.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm font-medium text-emerald-900 break-all">
              {paymentLink.url}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(paymentLink.url);
                push('success', 'Link copiado para a área de transferência.');
              }}
            >
              <Copy className="h-4 w-4" /> Copiar Link
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={extendModalOpen} onClose={() => setExtendModalOpen(false)} title="Prorrogar Contrato">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Indique quantos meses deseja acrescentar à duração do contrato. Será gerado um aditivo automaticamente.
          </p>
          <FormField label="Meses a prorrogar" required>
            <Input
              type="number"
              min={1}
              placeholder="Ex: 12"
              value={extendMonths}
              onChange={(e) => setExtendMonths(e.target.value)}
            />
          </FormField>
          <Button
            className="w-full"
            disabled={!extendMonths || Number(extendMonths) < 1}
            loading={extendMutation.isPending}
            onClick={() => extendMutation.mutate(Number(extendMonths))}
          >
            <CalendarClock className="h-4 w-4" /> Prorrogar Contrato
          </Button>
        </div>
      </Modal>

      <Modal
        open={terminateModalOpen}
        onClose={() => {
          setTerminateModalOpen(false);
          setTerminateReason('');
          setTerminateReasonOther('');
        }}
        title="Rescindir Contrato"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            O contrato deixa de estar em vigor e o cliente passa a Rescindido. Esta acção fica registada no
            histórico do contrato.
          </p>
          <FormField label="Motivo da rescisão" required>
            <Select value={terminateReason} onChange={(e) => setTerminateReason(e.target.value)}>
              <option value="">Seleccione...</option>
              {TERMINATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </FormField>
          {terminateReason === 'Outro' && (
            <FormField label="Descreva o motivo" required>
              <Textarea
                value={terminateReasonOther}
                onChange={(e) => setTerminateReasonOther(e.target.value)}
                placeholder="Indique o motivo da rescisão"
              />
            </FormField>
          )}
          <Button
            className="w-full"
            variant="destructive"
            disabled={!terminateReasonFinal}
            onClick={() => setTerminateConfirmOpen(true)}
          >
            <XCircle className="h-4 w-4" /> Rescindir Contrato
          </Button>
        </div>
      </Modal>

      <PasswordConfirmDialog
        open={terminateConfirmOpen}
        onClose={() => setTerminateConfirmOpen(false)}
        onConfirmed={() => terminateMutation.mutate()}
        title="Confirmar rescisão"
        description={`Introduza a sua password para confirmar a rescisão deste contrato. Motivo: "${terminateReasonFinal}".`}
        confirmLabel="Rescindir Contrato"
        loading={terminateMutation.isPending}
      />

      <Modal open={depModalOpen} onClose={closeDepModal} title={editingDependentId ? 'Editar Dependente' : 'Adicionar Dependente'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" required>
              <Input value={depForm.firstName} onChange={(e) => setDepForm((f) => ({ ...f, firstName: e.target.value }))} />
            </FormField>
            <FormField label="Apelido" required>
              <Input value={depForm.lastName} onChange={(e) => setDepForm((f) => ({ ...f, lastName: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Grau de Parentesco" required>
            <Select value={depForm.relationship} onChange={(e) => setDepForm((f) => ({ ...f, relationship: e.target.value }))}>
              <option value="">Seleccione...</option>
              {['Cônjuge', 'Filho(a)', 'Pai', 'Mãe', 'Outro'].map((r) => (
                <option
                  key={r}
                  value={r}
                  disabled={relationshipAlreadyTaken(client?.dependents ?? [], r, editingDependentId ?? undefined)}
                >
                  {r}
                </option>
              ))}
            </Select>
            {relationshipAlreadyTaken(client?.dependents ?? [], depForm.relationship, editingDependentId ?? undefined) && (
              <p className="mt-1.5 text-xs text-rose-600">{relationshipLimitMessage(depForm.relationship)}</p>
            )}
          </FormField>
          <FormField
            label="Data de Nascimento"
            required={depForm.relationship === 'Pai' || depForm.relationship === 'Mãe' || depForm.relationship === 'Cônjuge'}
            error={depForm.relationship ? dependentBirthDateError(depForm.relationship, depForm.birthDate, client?.birthDate) : null}
          >
            <DateField max={new Date().toISOString().slice(0, 10)} value={depForm.birthDate} onChange={(v) => setDepForm((f) => ({ ...f, birthDate: v }))} />
          </FormField>
          <Button
            className="w-full"
            onClick={() => (editingDependentId ? updateDependentMutation.mutate() : addDependentMutation.mutate())}
            disabled={
              !depForm.firstName ||
              !depForm.lastName ||
              !depForm.relationship ||
              relationshipAlreadyTaken(client?.dependents ?? [], depForm.relationship, editingDependentId ?? undefined) ||
              !!(depForm.relationship && dependentBirthDateError(depForm.relationship, depForm.birthDate, client?.birthDate))
            }
            loading={addDependentMutation.isPending || updateDependentMutation.isPending}
          >
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal open={claimModalOpen} onClose={closeClaimModal} title="Registar Sinistro">
        <div className="space-y-4">
          <FormField label="Beneficiário Falecido" required>
            <Select
              value={claimForm.beneficiary}
              onChange={(e) => setClaimForm((f) => ({ ...f, beneficiary: e.target.value }))}
            >
              <option value="">Seleccione...</option>
              {contract?.status !== 'FULFILLED' && <option value="CLIENT">{client.fullName} (Titular)</option>}
              {activeDependents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.relationship})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data de Falecimento" required>
            <DateField
              max={new Date().toISOString().slice(0, 10)}
              value={claimForm.dateOfDeath}
              onChange={(v) => setClaimForm((f) => ({ ...f, dateOfDeath: v }))}
            />
          </FormField>
          <FormField label="Observações (opcional)">
            <Textarea value={claimForm.notes} onChange={(e) => setClaimForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <FormField label="Certidão de Óbito (opcional)" hint="Anexe se tiver a certidão digitalizada — pode também apresentá-la só em papel.">
            <FileUploadField value={claimDeathCertificate} onChange={setClaimDeathCertificate} uploadFn={UploadsApi.uploadClaimDocument} />
          </FormField>
          {claimForm.beneficiary && (
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              {claimForm.beneficiary === 'CLIENT'
                ? `Esta acção conclui o contrato: deixa de haver mais mensalidades a cobrar.${dependentsCoverageWindowNote(activeDependents.length, systemSettings?.postDeathClaimWindowMonths)}`
                : 'Esta acção remove este dependente da lista de beneficiários cobertos.'}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => createClaimMutation.mutate()}
            disabled={!claimForm.beneficiary || !claimForm.dateOfDeath}
            loading={createClaimMutation.isPending}
          >
            Registar Sinistro
          </Button>
        </div>
      </Modal>


      <Modal
        open={!!confirmClaimTarget}
        onClose={() => {
          setConfirmClaimTarget(null);
          setConfirmDeathCertificate(null);
        }}
        title="Confirmar Sinistro"
      >
        {confirmClaimTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Está prestes a confirmar presencialmente o falecimento de{' '}
              <span className="font-medium text-slate-900">{confirmClaimTarget.deceasedName}</span>
              {confirmClaimTarget.beneficiaryType === 'DEPENDENT'
                ? ` (${confirmClaimTarget.dependent?.relationship ?? 'dependente'})`
                : ' (Titular)'}
              , comunicado em {formatDate(confirmClaimTarget.dateOfDeath)}.
            </p>
            {confirmClaimTarget.requesterName && (
              <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                Comunicado online por <span className="font-medium">{confirmClaimTarget.requesterName}</span>
                {confirmClaimTarget.requesterRelationship ? ` (${confirmClaimTarget.requesterRelationship})` : ''}
                {confirmClaimTarget.requesterPhone ? ` · ${confirmClaimTarget.requesterPhone}` : ''}. Confirme que a
                Certidão de Óbito e os documentos de identificação foram apresentados antes de continuar.
              </p>
            )}
            {confirmClaimTarget.deathCertificatePath ? (
              <Button
                variant="outline"
                size="sm"
                loading={isPdfPending(`${confirmClaimTarget.id}-certificate`)}
                onClick={() =>
                  runPdf(`${confirmClaimTarget.id}-certificate`, () =>
                    DocumentsApi.openClaimDeathCertificate(confirmClaimTarget.id),
                  )
                }
              >
                <FileText className="h-4 w-4" /> Ver Certidão Já Anexada
              </Button>
            ) : (
              <FormField label="Certidão de Óbito (opcional)" hint="Anexe agora se a família a trouxe em papel.">
                <FileUploadField value={confirmDeathCertificate} onChange={setConfirmDeathCertificate} uploadFn={UploadsApi.uploadClaimDocument} />
              </FormField>
            )}
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              {confirmClaimTarget.beneficiaryType === 'CLIENT'
                ? `Esta acção conclui o contrato: deixa de haver mais mensalidades a cobrar e o cliente passa a Falecido(a).${dependentsCoverageWindowNote(activeDependents.length, systemSettings?.postDeathClaimWindowMonths)}`
                : 'Esta acção remove este dependente da lista de beneficiários cobertos.'}{' '}
              O Termo de Sinistro fica disponível de imediato.
            </p>
            <Button
              className="w-full"
              onClick={() => confirmClaimMutation.mutate(confirmClaimTarget.id)}
              loading={confirmClaimMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirmar Sinistro
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectClaimId}
        onClose={() => {
          setRejectClaimId(null);
          setRejectReason('');
        }}
        title="Rejeitar Pedido de Comunicação de Óbito"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Use esta opção quando os dados não puderem ser confirmados presencialmente (ex: engano, documentação em
            falta). Nenhuma cobertura foi alterada até agora; a rejeição não tem efeitos adicionais. Indique o motivo.
          </p>
          <FormField label="Motivo" required>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </FormField>
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => rejectClaimMutation.mutate()}
            disabled={rejectReason.trim().length < 3}
            loading={rejectClaimMutation.isPending}
          >
            Confirmar Rejeição
          </Button>
        </div>
      </Modal>
    </div>
  );
}
