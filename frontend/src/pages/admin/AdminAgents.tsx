import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, ShieldCheck, ShieldPlus, UserCog, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { UsersApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { PasswordConfirmDialog } from '@/components/ui/PasswordConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';
import type { Agent, Permission } from '@/types';

const PERMISSION_LABELS: Record<Permission, string> = {
  VIEW_DASHBOARD: 'Dashboard',
  MANAGE_CLIENTS: 'Clientes',
  MANAGE_DELINQUENCY: 'Inadimplência',
  MANAGE_PAYMENTS: 'Pagamentos',
  MANAGE_CLAIMS: 'Sinistros',
  DELETE_DEPENDENTS: 'Remover dependentes',
  EXTEND_CONTRACTS: 'Prorrogar contratos',
  TERMINATE_CONTRACTS: 'Rescindir contratos',
};

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

const PAGE_SIZE = 10;

type IdentifierCheck = { checking: boolean; valid: boolean; available: boolean };

function slugifyNamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Sugere "nome.apelido" a partir do nome próprio e apelido — o admin pode sempre corrigir à mão. */
function suggestIdentifier(firstName: string, lastName: string): string {
  const first = slugifyNamePart(firstName.trim().split(/\s+/)[0] ?? '');
  const lastWords = lastName.trim().split(/\s+/).filter(Boolean);
  const last = slugifyNamePart(lastWords[lastWords.length - 1] ?? '');
  if (!first) return '';
  return last ? `${first}.${last}` : first;
}

/** Verifica sempre, em tempo real, se um identificador é válido e está livre (excluindo, ao
 * editar, o próprio utilizador — para não acusar o seu identificador actual como "em uso"). */
function useLiveIdentifierCheck(identifier: string, excludeId?: string): IdentifierCheck | null {
  const [check, setCheck] = useState<IdentifierCheck | null>(null);

  useEffect(() => {
    const value = identifier.trim();
    if (!value) {
      setCheck(null);
      return;
    }
    setCheck({ checking: true, valid: true, available: true });
    const timeout = setTimeout(() => {
      UsersApi.checkIdentifierAvailable(value, excludeId)
        .then((res) => setCheck({ checking: false, ...res }))
        .catch(() => setCheck(null));
    }, 400);
    return () => clearTimeout(timeout);
  }, [identifier, excludeId]);

  return check;
}

function isIdentifierReady(check: IdentifierCheck | null): boolean {
  return !!check && !check.checking && check.valid && check.available;
}

function IdentifierStatus({ check }: { check: IdentifierCheck | null }) {
  if (!check) return null;
  const tone = check.checking ? 'text-slate-400' : check.valid && check.available ? 'text-emerald-700' : 'text-rose-600';
  return (
    <p className={`-mt-3 flex items-center gap-1.5 text-xs font-medium ${tone}`}>
      {check.checking ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> A verificar identificador...
        </>
      ) : !check.valid ? (
        <>
          <XCircle className="h-3.5 w-3.5" /> Só pode conter letras, números, pontos, hífenes e underscores (mín. 3 caracteres).
        </>
      ) : !check.available ? (
        <>
          <XCircle className="h-3.5 w-3.5" /> Este identificador já está em uso. Escolha outro.
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" /> Utilizador disponível.
        </>
      )}
    </p>
  );
}

function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (permissions: Permission[]) => void;
}) {
  const toggle = (p: Permission) =>
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {ALL_PERMISSIONS.map((p) => (
        <label
          key={p}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50/50"
        >
          <input
            type="checkbox"
            checked={selected.includes(p)}
            onChange={() => toggle(p)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800/20"
          />
          <span className="text-slate-700">{PERMISSION_LABELS[p]}</span>
        </label>
      ))}
    </div>
  );
}

export default function AdminAgents() {
  const { push } = useToast();
  const queryClient = useQueryClient();

  // Registar Agente
  const [createOpen, setCreateOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newIdentifierEdited, setNewIdentifierEdited] = useState(false);
  const [newPermissions, setNewPermissions] = useState<Permission[]>([]);
  const newIdentifierCheck = useLiveIdentifierCheck(newIdentifier);

  // Registar Administrador
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [adminConfirmOpen, setAdminConfirmOpen] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminIdentifierEdited, setAdminIdentifierEdited] = useState(false);
  const adminIdentifierCheck = useLiveIdentifierCheck(adminIdentifier);

  // Editar (agente ou administrador)
  const [editStaff, setEditStaff] = useState<Agent | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIdentifier, setEditIdentifier] = useState('');
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);
  const editIdentifierCheck = useLiveIdentifierCheck(editIdentifier, editStaff?.id);

  const [credentials, setCredentials] = useState<{ identifier: string; password: string } | null>(null);

  const { data: staff, isLoading } = useQuery({ queryKey: ['admin-staff'], queryFn: UsersApi.listStaff });
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((staff?.length ?? 0) / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paginatedStaff = staff?.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  useEffect(() => {
    if (newIdentifierEdited) return;
    setNewIdentifier(suggestIdentifier(newFirstName, newLastName));
  }, [newFirstName, newLastName, newIdentifierEdited]);

  useEffect(() => {
    if (adminIdentifierEdited) return;
    setAdminIdentifier(suggestIdentifier(adminFirstName, adminLastName));
  }, [adminFirstName, adminLastName, adminIdentifierEdited]);

  const resetCreateForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewIdentifier('');
    setNewIdentifierEdited(false);
    setNewPermissions([]);
  };

  const resetAdminForm = () => {
    setAdminFirstName('');
    setAdminLastName('');
    setAdminIdentifier('');
    setAdminIdentifierEdited(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      UsersApi.createAgent({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        identifier: newIdentifier.trim(),
        permissions: newPermissions,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setCreateOpen(false);
      setCredentials({ identifier: res.user.identifier, password: res.temporaryPassword });
      resetCreateForm();
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível registar o agente.')),
  });

  const createAdminMutation = useMutation({
    mutationFn: () =>
      UsersApi.createAdmin({
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        identifier: adminIdentifier.trim(),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setAdminConfirmOpen(false);
      setCreateAdminOpen(false);
      setCredentials({ identifier: res.user.identifier, password: res.temporaryPassword });
      resetAdminForm();
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível registar o administrador.')),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { firstName?: string; lastName?: string; identifier?: string; permissions?: Permission[]; active?: boolean }) =>
      UsersApi.updateStaff(editStaff!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      push('success', 'Utilizador actualizado.');
      setEditStaff(null);
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (member: Agent) => UsersApi.updateStaff(member.id, { active: !member.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      push('success', 'Estado actualizado.');
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível alterar o estado.')),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (member: Agent) => UsersApi.resetPassword(member.id),
    onSuccess: (res, member) => {
      setCredentials({ identifier: member.identifier, password: res.temporaryPassword });
      push('success', 'Password reposta com sucesso.');
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Gestão de Agentes"
        description="Registe utilizadores internos e determine a que áreas do sistema têm acesso."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateAdminOpen(true)}>
              <ShieldPlus className="h-4 w-4" /> Registar Administrador
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Registar Agente
            </Button>
          </div>
        }
      />

      <Table
        footer={
          !isLoading &&
          !!staff?.length && (
            <Pagination page={pageClamped} totalPages={totalPages} totalItems={staff.length} pageSize={PAGE_SIZE} onChange={setPage} />
          )
        }
      >
        <THead>
          <TR>
            <TH>Nome</TH>
            <TH>Papel</TH>
            <TH>Estado</TH>
            <TH>Permissões</TH>
            <TH>Último Acesso</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {isLoading ? (
            <TR>
              <TD colSpan={6} className="text-center text-slate-400">
                A carregar...
              </TD>
            </TR>
          ) : (
            paginatedStaff?.map((member) => (
              <TR key={member.id}>
                <TD>
                  <p className="font-medium text-slate-900">
                    {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.identifier}
                  </p>
                  <p className="text-xs text-slate-400">{member.identifier}</p>
                </TD>
                <TD>
                  <Badge variant={member.role === 'ADMIN' ? 'gold' : 'neutral'}>
                    {member.role === 'ADMIN' ? 'Administrador' : 'Agente'}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant={member.active ? 'success' : 'neutral'} dot>
                    {member.active ? 'Activo' : 'Desactivado'}
                  </Badge>
                </TD>
                <TD>
                  {member.role === 'ADMIN' ? (
                    <span className="text-xs text-slate-400">Acesso total</span>
                  ) : member.permissions.length === 0 ? (
                    <span className="text-xs text-slate-400">Sem permissões atribuídas</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {member.permissions.map((p) => (
                        <Badge key={p} variant="neutral">
                          {PERMISSION_LABELS[p]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TD>
                <TD className="text-slate-500">{member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Nunca'}</TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditStaff(member);
                        setEditFirstName(member.firstName ?? '');
                        setEditLastName(member.lastName ?? '');
                        setEditIdentifier(member.identifier);
                        setEditPermissions(member.permissions);
                      }}
                    >
                      <UserCog className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPasswordMutation.mutate(member)}
                      loading={resetPasswordMutation.isPending && resetPasswordMutation.variables?.id === member.id}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Repor Password
                    </Button>
                    <Button
                      variant={member.active ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate(member)}
                      loading={toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === member.id}
                    >
                      {member.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {!isLoading && staff?.length === 0 && <EmptyState message="Nenhum utilizador registado." />}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        title="Registar Agente"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" required>
              <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Maria" />
            </FormField>
            <FormField label="Apelido" required>
              <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="João" />
            </FormField>
          </div>
          <FormField label="Utilizador" required hint="Usado para iniciar sessão. Gerado automaticamente a partir do nome — pode editar.">
            <Input
              value={newIdentifier}
              invalid={!!newIdentifierCheck && !newIdentifierCheck.checking && (!newIdentifierCheck.valid || !newIdentifierCheck.available)}
              onChange={(e) => {
                setNewIdentifierEdited(true);
                setNewIdentifier(e.target.value);
              }}
              placeholder="agente.nome"
            />
          </FormField>
          <IdentifierStatus check={newIdentifierCheck} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-700" />
              Áreas de acesso
            </label>
            <PermissionCheckboxes selected={newPermissions} onChange={setNewPermissions} />
          </div>
          <Button
            className="w-full"
            disabled={newFirstName.trim().length < 2 || newLastName.trim().length < 2 || !isIdentifierReady(newIdentifierCheck)}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Registar Agente e Gerar Credenciais
          </Button>
        </div>
      </Modal>

      <Modal
        open={createAdminOpen}
        onClose={() => {
          setCreateAdminOpen(false);
          resetAdminForm();
        }}
        title="Registar Administrador"
      >
        <div className="space-y-5">
          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            Um administrador tem acesso total ao sistema — a todos os clientes, contratos, pagamentos e
            configurações — independentemente de permissões atribuídas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" required>
              <Input value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} placeholder="Maria" />
            </FormField>
            <FormField label="Apelido" required>
              <Input value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} placeholder="João" />
            </FormField>
          </div>
          <FormField label="Utilizador" required hint="Usado para iniciar sessão. Gerado automaticamente a partir do nome — pode editar.">
            <Input
              value={adminIdentifier}
              invalid={!!adminIdentifierCheck && !adminIdentifierCheck.checking && (!adminIdentifierCheck.valid || !adminIdentifierCheck.available)}
              onChange={(e) => {
                setAdminIdentifierEdited(true);
                setAdminIdentifier(e.target.value);
              }}
              placeholder="admin.nome"
            />
          </FormField>
          <IdentifierStatus check={adminIdentifierCheck} />
          <Button
            className="w-full"
            variant="destructive"
            disabled={adminFirstName.trim().length < 2 || adminLastName.trim().length < 2 || !isIdentifierReady(adminIdentifierCheck)}
            onClick={() => setAdminConfirmOpen(true)}
          >
            <ShieldPlus className="h-4 w-4" /> Registar Administrador
          </Button>
        </div>
      </Modal>

      <PasswordConfirmDialog
        open={adminConfirmOpen}
        onClose={() => setAdminConfirmOpen(false)}
        onConfirmed={() => createAdminMutation.mutate()}
        title="Confirmar novo administrador"
        description={`Introduza a sua password para confirmar a criação de um administrador com acesso total: ${adminFirstName} ${adminLastName} (${adminIdentifier}).`}
        confirmLabel="Registar Administrador"
        loading={createAdminMutation.isPending}
      />

      <Modal
        open={!!editStaff}
        onClose={() => setEditStaff(null)}
        title={`Editar ${editStaff?.role === 'ADMIN' ? 'administrador' : 'agente'}`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" required>
              <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            </FormField>
            <FormField label="Apelido" required>
              <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Utilizador" required hint="Usado para iniciar sessão.">
            <Input
              value={editIdentifier}
              invalid={!!editIdentifierCheck && !editIdentifierCheck.checking && (!editIdentifierCheck.valid || !editIdentifierCheck.available)}
              onChange={(e) => setEditIdentifier(e.target.value)}
            />
          </FormField>
          {editIdentifier.trim() !== editStaff?.identifier && <IdentifierStatus check={editIdentifierCheck} />}
          {editStaff?.role === 'AGENT' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-700" />
                Áreas de acesso
              </label>
              <PermissionCheckboxes selected={editPermissions} onChange={setEditPermissions} />
            </div>
          )}
          <Button
            className="w-full"
            disabled={
              editFirstName.trim().length < 2 ||
              editLastName.trim().length < 2 ||
              (editIdentifier.trim() !== editStaff?.identifier && !isIdentifierReady(editIdentifierCheck))
            }
            loading={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                identifier: editIdentifier.trim(),
                permissions: editStaff?.role === 'AGENT' ? editPermissions : undefined,
              })
            }
          >
            Guardar Alterações
          </Button>
        </div>
      </Modal>

      {credentials && (
        <CredentialsModal
          open={!!credentials}
          onClose={() => setCredentials(null)}
          title="Utilizador registado com sucesso"
          description="Partilhe estas credenciais com o utilizador. A password é temporária e terá de ser alterada no primeiro acesso."
          identifier={credentials.identifier}
          password={credentials.password}
        />
      )}
    </div>
  );
}
