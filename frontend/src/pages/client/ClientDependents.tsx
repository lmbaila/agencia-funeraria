import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { PortalApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Select } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  CLIENT_EDIT_WINDOW_HOURS,
  dependentBirthDateError,
  isDependentEditWindowOpen,
  relationshipAlreadyTaken,
  relationshipLimitMessage,
} from '@/lib/dependents';
import type { Dependent } from '@/types';

const RELATIONSHIPS = ['Cônjuge', 'Filho(a)', 'Pai', 'Mãe', 'Irmão/Irmã', 'Outro'];

export default function ClientDependents() {
  const { data: overview } = useQuery({ queryKey: ['portal-overview'], queryFn: PortalApi.overview });
  const { data: dependents, isLoading } = useQuery({ queryKey: ['portal-dependents'], queryFn: PortalApi.dependents });
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', relationship: '', birthDate: '', documentNumber: '' });

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ firstName: '', lastName: '', relationship: '', birthDate: '', documentNumber: '' });
  };

  const startEdit = (d: Dependent) => {
    const [firstName, ...rest] = d.fullName.split(' ');
    setForm({
      firstName,
      lastName: rest.join(' '),
      relationship: d.relationship,
      birthDate: d.birthDate?.slice(0, 10) ?? '',
      documentNumber: d.documentNumber ?? '',
    });
    setEditingId(d.id);
    setOpen(true);
  };

  const addMutation = useMutation({
    mutationFn: () => PortalApi.addDependent(form),
    onSuccess: () => {
      push('success', 'Dependente adicionado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['portal-dependents'] });
      closeModal();
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () => PortalApi.updateDependent(editingId!, form),
    onSuccess: () => {
      push('success', 'Dependente actualizado.');
      queryClient.invalidateQueries({ queryKey: ['portal-dependents'] });
      closeModal();
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => PortalApi.removeDependent(id),
    onSuccess: () => {
      push('success', 'Dependente removido.');
      queryClient.invalidateQueries({ queryKey: ['portal-dependents'] });
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const birthDateError = form.relationship ? dependentBirthDateError(form.relationship, form.birthDate, overview?.birthDate) : null;

  return (
    <div>
      <PageHeader
        title="Meus Dependentes"
        description="Beneficiários associados ao seu plano de assistência funerária."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Adicionar Dependente
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">A carregar...</div>
        ) : !dependents || dependents.length === 0 ? (
          <EmptyState message="Ainda não tem dependentes registados." />
        ) : (
          <CardContent className="divide-y divide-slate-100 p-0">
            {dependents.map((d) => {
              const editable = isDependentEditWindowOpen(d.createdAt);
              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{d.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {d.relationship} {d.birthDate ? `· Nascimento: ${formatDate(d.birthDate)}` : ''}
                      </p>
                    </div>
                  </div>
                  {editable ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(d)}>
                        <Pencil className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        loading={removeMutation.isPending && removeMutation.variables === d.id}
                        onClick={() => removeMutation.mutate(d.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400" title="Contacte um agente para alterar este dependente.">
                      <Lock className="h-3.5 w-3.5" /> Contacte um agente
                    </span>
                  )}
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? 'Editar Dependente' : 'Adicionar Dependente'}>
        <div className="space-y-4">
          {editingId && (
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              Só pode editar ou remover um dependente até {CLIENT_EDIT_WINDOW_HOURS} horas depois de o registar. Depois
              disso, contacte um agente da agência.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" required>
              <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </FormField>
            <FormField label="Apelido" required>
              <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Grau de Parentesco" required>
            <Select
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            >
              <option value="">Seleccione...</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r} disabled={relationshipAlreadyTaken(dependents ?? [], r, editingId ?? undefined)}>
                  {r}
                </option>
              ))}
            </Select>
            {relationshipAlreadyTaken(dependents ?? [], form.relationship, editingId ?? undefined) && (
              <p className="mt-1.5 text-xs text-rose-600">{relationshipLimitMessage(form.relationship)}</p>
            )}
          </FormField>
          <FormField
            label="Data de Nascimento"
            required={form.relationship === 'Pai' || form.relationship === 'Mãe' || form.relationship === 'Cônjuge'}
            error={birthDateError}
          >
            <DateField max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))} />
          </FormField>
          <FormField label="Documento de Identificação">
            <Input value={form.documentNumber} onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))} />
          </FormField>
          <Button
            className="w-full"
            disabled={
              !form.firstName ||
              !form.lastName ||
              !form.relationship ||
              relationshipAlreadyTaken(dependents ?? [], form.relationship, editingId ?? undefined) ||
              !!birthDateError
            }
            loading={addMutation.isPending || updateMutation.isPending}
            onClick={() => (editingId ? updateMutation.mutate() : addMutation.mutate())}
          >
            Guardar Dependente
          </Button>
        </div>
      </Modal>
    </div>
  );
}
