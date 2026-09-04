import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen } from 'lucide-react';
import { PlansApi, type PlanInput } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/utils';
import type { Plan } from '@/types';

interface PlanFormState {
  name: string;
  displayName: string;
  description: string;
  urnDescription: string;
  coverageMin: string;
  coverageMax: string;
  monthlyFee: string;
  quarterlyFee: string;
  semiannualFee: string;
  annualFee: string;
  sortOrder: string;
}

const EMPTY_FORM: PlanFormState = {
  name: '',
  displayName: '',
  description: '',
  urnDescription: '',
  coverageMin: '',
  coverageMax: '',
  monthlyFee: '',
  quarterlyFee: '',
  semiannualFee: '',
  annualFee: '',
  sortOrder: '0',
};

function planToForm(plan: Plan): PlanFormState {
  return {
    name: plan.name,
    displayName: plan.displayName,
    description: plan.description ?? '',
    urnDescription: plan.urnDescription ?? '',
    coverageMin: String(plan.coverageMin),
    coverageMax: plan.coverageMax != null ? String(plan.coverageMax) : '',
    monthlyFee: String(plan.monthlyFee),
    quarterlyFee: String(plan.quarterlyFee),
    semiannualFee: String(plan.semiannualFee),
    annualFee: String(plan.annualFee),
    sortOrder: String(plan.sortOrder),
  };
}

function formToPayload(form: PlanFormState): PlanInput {
  return {
    name: form.name.trim(),
    displayName: form.displayName.trim(),
    description: form.description.trim() || undefined,
    urnDescription: form.urnDescription.trim() || undefined,
    coverageMin: Number(form.coverageMin),
    coverageMax: form.coverageMax.trim() ? Number(form.coverageMax) : null,
    monthlyFee: Number(form.monthlyFee),
    quarterlyFee: Number(form.quarterlyFee),
    semiannualFee: Number(form.semiannualFee),
    annualFee: Number(form.annualFee),
    sortOrder: Number(form.sortOrder || 0),
  };
}

function isFormValid(form: PlanFormState): boolean {
  const requiredNumbers = [form.coverageMin, form.monthlyFee, form.quarterlyFee, form.semiannualFee, form.annualFee];
  return (
    form.name.trim().length >= 2 &&
    form.displayName.trim().length >= 2 &&
    requiredNumbers.every((v) => v.trim() !== '' && !Number.isNaN(Number(v)))
  );
}

export default function AdminPlans() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);

  const { data: plans, isLoading } = useQuery({ queryKey: ['admin-plans'], queryFn: PlansApi.listAll });

  useEffect(() => {
    if (editPlan) setForm(planToForm(editPlan));
  }, [editPlan]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-plans'] });

  const createMutation = useMutation({
    mutationFn: () => PlansApi.create(formToPayload(form)),
    onSuccess: () => {
      invalidate();
      push('success', 'Plano criado com sucesso.');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível criar o plano.')),
  });

  const updateMutation = useMutation({
    mutationFn: () => PlansApi.update(editPlan!.id, formToPayload(form)),
    onSuccess: () => {
      invalidate();
      push('success', 'Plano actualizado com sucesso.');
      setConfirmEditOpen(false);
      setEditPlan(null);
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível actualizar o plano.')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (plan: Plan) => PlansApi.setActive(plan.id, !plan.active),
    onSuccess: () => {
      invalidate();
      push('success', 'Estado do plano actualizado.');
      setToggleTarget(null);
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const renderForm = (onSubmit: () => void, submitting: boolean, submitLabel: string) => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Identificador interno" required hint="Único, sem acentos. Ex: GOLD_FAMILIA">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))} />
        </FormField>
        <FormField label="Nome a exibir" required>
          <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="Descrição">
        <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </FormField>
      <FormField label="Descrição da urna" hint="Ex: Urna Especial Nº 2">
        <Input value={form.urnDescription} onChange={(e) => setForm((f) => ({ ...f, urnDescription: e.target.value }))} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Cobertura mínima (MT)" required>
          <Input type="number" min="0" value={form.coverageMin} onChange={(e) => setForm((f) => ({ ...f, coverageMin: e.target.value }))} />
        </FormField>
        <FormField label="Cobertura máxima (MT)" hint="Deixe em branco para sem limite">
          <Input type="number" min="0" value={form.coverageMax} onChange={(e) => setForm((f) => ({ ...f, coverageMax: e.target.value }))} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mensalidade Mensal (MT)" required>
          <Input type="number" min="0" step="0.01" value={form.monthlyFee} onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
        </FormField>
        <FormField label="Mensalidade Trimestral (MT)" required>
          <Input type="number" min="0" step="0.01" value={form.quarterlyFee} onChange={(e) => setForm((f) => ({ ...f, quarterlyFee: e.target.value }))} />
        </FormField>
        <FormField label="Mensalidade Semestral (MT)" required>
          <Input type="number" min="0" step="0.01" value={form.semiannualFee} onChange={(e) => setForm((f) => ({ ...f, semiannualFee: e.target.value }))} />
        </FormField>
        <FormField label="Mensalidade Anual (MT)" required>
          <Input type="number" min="0" step="0.01" value={form.annualFee} onChange={(e) => setForm((f) => ({ ...f, annualFee: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="Ordem de exibição" hint="Planos com valor menor aparecem primeiro">
        <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
      </FormField>
      <Button className="w-full" disabled={!isFormValid(form)} loading={submitting} onClick={onSubmit}>
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Gestão de Planos"
        description="Planos de assistência funerária, respectiva cobertura e preços por frequência de pagamento."
        action={
          <Button
            onClick={() => {
              setForm(EMPTY_FORM);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo Plano
          </Button>
        }
      />

      <Table>
        <THead>
          <TR>
            <TH>Plano</TH>
            <TH>Cobertura</TH>
            <TH>Mensal</TH>
            <TH>Trimestral</TH>
            <TH>Semestral</TH>
            <TH>Anual</TH>
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
            plans?.map((plan) => (
              <TR key={plan.id}>
                <TD>
                  <span className="font-medium text-slate-900">{plan.displayName}</span>
                  <p className="text-xs text-slate-400">{plan.name}</p>
                </TD>
                <TD>
                  {formatMoney(plan.coverageMin)}
                  {plan.coverageMax ? ` a ${formatMoney(plan.coverageMax)}` : '+'}
                </TD>
                <TD>{formatMoney(plan.monthlyFee)}</TD>
                <TD>{formatMoney(plan.quarterlyFee)}</TD>
                <TD>{formatMoney(plan.semiannualFee)}</TD>
                <TD>{formatMoney(plan.annualFee)}</TD>
                <TD>
                  <Badge variant={plan.active ? 'success' : 'neutral'} dot>
                    {plan.active ? 'Activo' : 'Desactivado'}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditPlan(plan)}>
                      <SquarePen className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant={plan.active ? 'destructive' : 'default'} size="sm" onClick={() => setToggleTarget(plan)}>
                      {plan.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {!isLoading && plans?.length === 0 && <EmptyState message="Nenhum plano registado." />}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo Plano" className="max-w-2xl">
        {renderForm(() => createMutation.mutate(), createMutation.isPending, 'Criar Plano')}
      </Modal>

      <Modal
        open={!!editPlan}
        onClose={() => {
          setEditPlan(null);
          setConfirmEditOpen(false);
        }}
        title={`Editar ${editPlan?.displayName ?? ''}`}
        className="max-w-2xl"
      >
        {renderForm(() => setConfirmEditOpen(true), updateMutation.isPending, 'Guardar Alterações')}
      </Modal>

      <ConfirmDialog
        open={confirmEditOpen}
        onClose={() => setConfirmEditOpen(false)}
        onConfirm={() => updateMutation.mutate()}
        title="Confirmar alterações"
        description={`Tem a certeza que quer guardar as alterações ao plano "${editPlan?.displayName ?? ''}"? Os novos valores passam a aplicar-se de imediato a novas adesões; não afectam contratos já assinados.`}
        confirmLabel="Guardar Alterações"
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleActiveMutation.mutate(toggleTarget!)}
        title={toggleTarget?.active ? 'Desactivar plano' : 'Activar plano'}
        description={
          toggleTarget?.active
            ? `Tem a certeza que quer desactivar o plano "${toggleTarget?.displayName}"? Deixa de estar disponível para novas adesões, mas os contratos já assinados não são afectados.`
            : `Tem a certeza que quer activar o plano "${toggleTarget?.displayName}"? Volta a ficar disponível para novas adesões.`
        }
        confirmLabel={toggleTarget?.active ? 'Desactivar' : 'Activar'}
        variant={toggleTarget?.active ? 'destructive' : 'default'}
        loading={toggleActiveMutation.isPending}
      />
    </div>
  );
}
