import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SettingsApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/Card';
import { FormField, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordConfirmDialog } from '@/components/ui/PasswordConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';

export default function AdminSettings() {
  const { push } = useToast();
  const { data: settings, isLoading } = useQuery({ queryKey: ['system-settings'], queryFn: SettingsApi.get });

  const [lateFeePercent, setLateFeePercent] = useState('');
  const [suspensionThreshold, setSuspensionThreshold] = useState('');
  const [suspensionDays, setSuspensionDays] = useState('');
  const [gracePeriodMonths, setGracePeriodMonths] = useState('');
  const [postDeathClaimWindowMonths, setPostDeathClaimWindowMonths] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setLateFeePercent(String(settings.lateFeeMonthlyRatePercent));
    setSuspensionThreshold(String(settings.suspensionThresholdInstallments));
    setSuspensionDays(String(settings.suspensionRegularizationDays));
    setGracePeriodMonths(String(settings.gracePeriodMonths));
    setPostDeathClaimWindowMonths(String(settings.postDeathClaimWindowMonths));
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () =>
      SettingsApi.update({
        lateFeeMonthlyRatePercent: Number(lateFeePercent),
        suspensionThresholdInstallments: Number(suspensionThreshold),
        suspensionRegularizationDays: Number(suspensionDays),
        gracePeriodMonths: Number(gracePeriodMonths),
        postDeathClaimWindowMonths: Number(postDeathClaimWindowMonths),
      }),
    onSuccess: () => {
      push('success', 'Definições actualizadas com sucesso.');
      setConfirmOpen(false);
    },
    onError: (err) => push('error', apiErrorMessage(err, 'Não foi possível actualizar as definições.')),
  });

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Parâmetros de negócio aplicados automaticamente aos contratos e à verificação diária de inadimplência."
      />

      {isLoading ? (
        <p className="text-sm text-slate-400">A carregar...</p>
      ) : (
        <form
          className="max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
        >
          <Card>
            <CardContent className="space-y-8 p-8">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Carência</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Período após o pagamento da taxa de adesão durante o qual o contrato ainda não dá direito a
                  cobertura (ex: activação de sinistros).
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Meses de carência"
                    hint="0 significa sem período de carência: a cobertura fica activa logo após o pagamento da taxa de adesão."
                  >
                    <Input type="number" min={0} step={1} value={gracePeriodMonths} onChange={(e) => setGracePeriodMonths(e.target.value)} required />
                  </FormField>
                </div>
              </section>

              <div className="border-t border-slate-100" />

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Sinistros</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Se o titular falecer primeiro, o contrato conclui-se, mas este prazo mantém ainda a possibilidade de
                  comunicar o óbito de um dependente que só seja reportado depois.
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Prazo após o óbito do titular (meses)"
                    hint="Durante este período, mesmo com o contrato já concluído, ainda é possível comunicar e confirmar o óbito de um dependente coberto."
                  >
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={postDeathClaimWindowMonths}
                      onChange={(e) => setPostDeathClaimWindowMonths(e.target.value)}
                      required
                    />
                  </FormField>
                </div>
              </section>

              <div className="border-t border-slate-100" />

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Regras de Inadimplência</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Estes valores substituem as regras anteriormente fixas no sistema (Cláusulas Oitava e Décima
                  Primeira do contrato) e passam a ser aplicados na verificação diária de inadimplência.
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <FormField label="Juros de mora ao mês (%)" tooltip="Aplicado sobre mensalidades em atraso.">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={lateFeePercent}
                      onChange={(e) => setLateFeePercent(e.target.value)}
                      required
                    />
                  </FormField>

                  <FormField
                    label="Rescisão após suspensão (dias)"
                    tooltip="Se o contrato continuar suspenso e por regularizar após estes dias, é rescindido automaticamente."
                  >
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={suspensionDays}
                      onChange={(e) => setSuspensionDays(e.target.value)}
                      required
                    />
                  </FormField>

                  <FormField
                    label="Suspensão automática após (nº de mensalidades em atraso)"
                    tooltip="O contrato é suspenso ao acumular este número de mensalidades em atraso."
                  >
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={suspensionThreshold}
                      onChange={(e) => setSuspensionThreshold(e.target.value)}
                      required
                    />
                  </FormField>
                </div>
              </section>

              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                {settings && (
                  <p className="text-xs text-slate-400">
                    Última actualização: {formatDateTime(settings.updatedAt)}
                    {settings.updatedById && ` · por ${settings.updatedById}`}
                  </p>
                )}
                <Button type="submit">Guardar Alterações</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      <PasswordConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={() => updateMutation.mutate()}
        title="Confirmar Alterações"
        description="Estas definições aplicam-se de imediato a todos os clientes e contratos existentes. Introduza a sua password para confirmar."
        confirmLabel="Confirmar e Guardar"
        variant="default"
        loading={updateMutation.isPending}
      />
    </div>
  );
}
