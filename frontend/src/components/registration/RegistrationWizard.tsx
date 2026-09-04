import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Baby,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  IdCard,
  KeyRound,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react';
import { PlansApi, PublicApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FormField, Input, Select } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { FileUploadField } from '@/components/ui/FileUploadField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { cn, formatMoney } from '@/lib/utils';
import { NATIONALITIES, PROVINCES, PROVINCE_DISTRICTS, documentNumberHint } from '@/lib/mz';
import { dependentBirthDateError, relationshipAlreadyTaken, relationshipLimitMessage } from '@/lib/dependents';
import { inferProvinceFromDistrict, matchDistrict, matchProvince } from '@/lib/address';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import type { AddressSuggestion } from '@/api/endpoints';
import {
  CONTACT_STEP_FIELDS,
  CREDENTIALS_STEP_FIELDS,
  PERSONAL_STEP_FIELDS,
  PLAN_STEP_FIELDS,
  buildRegisterPayload,
  clientFieldErrors,
  initialClientFormState,
  type RegisterFormState,
} from '@/lib/clientForm';
import type { DependentInput, Plan } from '@/types';
import type { RegisterResponse } from '@/api/endpoints';

const TODAY = new Date().toISOString().slice(0, 10);

const STEPS = [
  { label: 'Dados Pessoais', icon: UserRound },
  { label: 'Contacto & Endereço', icon: MapPin },
  { label: 'Plano & Frequência', icon: Wallet },
  { label: 'Dependentes & Resumo', icon: Baby },
];

const STEP_FIELDS = [PERSONAL_STEP_FIELDS, CONTACT_STEP_FIELDS, PLAN_STEP_FIELDS, CREDENTIALS_STEP_FIELDS];

function slugifyNamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Sugere "linicial+apelido" (ex: Lazaro Mateus + Mbaila → lmbaila) — convenção mais compacta
 * do que a usada para agentes internos, mais próxima do que as pessoas já esperam de um utilizador. */
function suggestClientIdentifier(firstName: string, lastName: string): string {
  const firstInitial = slugifyNamePart(firstName.trim().split(/\s+/)[0] ?? '').slice(0, 1);
  const lastWords = lastName.trim().split(/\s+/).filter(Boolean);
  const surname = slugifyNamePart(lastWords[lastWords.length - 1] ?? '');
  if (!firstInitial || !surname) return '';
  return `${firstInitial}${surname}`;
}

const FREQUENCIES: { value: string; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
];

const RELATIONSHIPS = ['Cônjuge', 'Filho(a)', 'Pai', 'Mãe', 'Irmão/Irmã', 'Outro'];

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken';

type RegisterPayload = ReturnType<typeof buildRegisterPayload> & { dependents: DependentInput[] };

export interface RegistrationWizardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  submitLabel?: string;
  initialPlanId?: string;
  onSubmit: (payload: RegisterPayload) => Promise<RegisterResponse>;
  onSuccess: (result: RegisterResponse) => void;
  errorFallback?: string;
  /** Reduz o espaçamento vertical do topo — usado quando a página já está dentro de um layout com o seu próprio padding (ex: dashboard administrativo). */
  compact?: boolean;
}

export function RegistrationWizard({
  eyebrow,
  title,
  description,
  submitLabel = 'Concluir e Gerar Credenciais',
  initialPlanId,
  onSubmit,
  onSuccess,
  errorFallback = 'Não foi possível concluir o registo.',
  compact = false,
}: RegistrationWizardProps) {
  const { push } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterFormState>(initialClientFormState);
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterFormState, boolean>>>({});
  const [dependents, setDependents] = useState<DependentInput[]>([]);
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: PlansApi.list });

  useEffect(() => {
    if (initialPlanId) setForm((f) => ({ ...f, planId: initialPlanId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlanId]);

  const selectedPlan = plans?.find((p) => p.id === form.planId);
  const feeForFrequency = (plan: Plan | undefined, freq: string) => {
    if (!plan) return 0;
    const map: Record<string, any> = {
      MONTHLY: plan.monthlyFee,
      QUARTERLY: plan.quarterlyFee,
      SEMIANNUAL: plan.semiannualFee,
      ANNUAL: plan.annualFee,
    };
    return Number(map[freq] ?? 0);
  };
  const membershipFee = selectedPlan ? Number(selectedPlan.coverageMin) * 0.1 : 0;

  const [documentNumberAvailability, setDocumentNumberAvailability] = useState<AvailabilityStatus>('idle');
  const [phoneAvailability, setPhoneAvailability] = useState<AvailabilityStatus>('idle');

  const errors = useMemo(() => clientFieldErrors(form), [form]);

  useEffect(() => {
    if (errors.documentNumber || !form.documentNumber.trim()) {
      setDocumentNumberAvailability('idle');
      return;
    }
    let cancelled = false;
    setDocumentNumberAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await PublicApi.checkAvailability({ documentNumber: form.documentNumber });
        if (!cancelled) setDocumentNumberAvailability(res.documentNumberTaken ? 'taken' : 'available');
      } catch {
        if (!cancelled) setDocumentNumberAvailability('idle');
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.documentNumber, errors.documentNumber]);

  useEffect(() => {
    if (errors.phone || !form.phone.trim()) {
      setPhoneAvailability('idle');
      return;
    }
    let cancelled = false;
    setPhoneAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await PublicApi.checkAvailability({ phone: form.phone });
        if (!cancelled) setPhoneAvailability(res.phoneTaken ? 'taken' : 'available');
      } catch {
        if (!cancelled) setPhoneAvailability('idle');
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.phone, errors.phone]);

  const [identifierEdited, setIdentifierEdited] = useState(false);
  const [identifierCheck, setIdentifierCheck] = useState<{ checking: boolean; valid: boolean; available: boolean } | null>(null);

  // Sugere o identificador a partir do nome enquanto o utilizador não o editar à mão.
  useEffect(() => {
    if (identifierEdited) return;
    setForm((f) => ({ ...f, identifier: suggestClientIdentifier(form.firstName, form.lastName) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.firstName, form.lastName, identifierEdited]);

  // Verifica sempre, em tempo real, se o identificador é válido e está livre. Se for a sugestão
  // automática (o utilizador ainda não editou à mão) e colidir com outra já registada, propõe
  // uma variante com os últimos 2 dígitos do telemóvel (ex: lmbaila → lmbaila84).
  useEffect(() => {
    const value = form.identifier.trim();
    if (!value || errors.identifier) {
      setIdentifierCheck(null);
      return;
    }
    let cancelled = false;
    setIdentifierCheck({ checking: true, valid: true, available: true });
    const timer = setTimeout(async () => {
      try {
        const res = await PublicApi.checkIdentifierAvailable(value);
        if (cancelled) return;
        setIdentifierCheck({ checking: false, ...res });
        const base = suggestClientIdentifier(form.firstName, form.lastName);
        if (!identifierEdited && res.valid && !res.available && value === base) {
          const phoneDigits = form.phone.replace(/\D/g, '').slice(-2);
          if (phoneDigits) setForm((f) => ({ ...f, identifier: `${base}${phoneDigits}` }));
        }
      } catch {
        if (!cancelled) setIdentifierCheck(null);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.identifier, errors.identifier]);

  const touch = (field: keyof RegisterFormState) => setTouched((t) => ({ ...t, [field]: true }));
  const fieldError = (field: keyof RegisterFormState) => (touched[field] ? errors[field] : undefined);
  const update = (field: keyof RegisterFormState, value: string | number) => setForm((f) => ({ ...f, [field]: value }));
  const updateBirthProvince = (value: string) =>
    setForm((f) => ({ ...f, placeOfBirthProvince: value, placeOfBirthDistrict: '' }));
  const updateAddressProvince = (value: string) => setForm((f) => ({ ...f, province: value, district: '' }));
  const handleAddressSuggestion = (s: AddressSuggestion) => {
    const province = matchProvince(s.province) ?? inferProvinceFromDistrict(s.district);
    const district = matchDistrict(province, s.district);
    setForm((f) => ({
      ...f,
      province: province ?? f.province,
      district: district ?? (province && province !== f.province ? '' : f.district),
      addressLine: f.addressLine || s.label,
    }));
  };

  const removeDependent = (index: number) => setDependents((d) => d.filter((_, i) => i !== index));

  const goNext = () => {
    const fields = STEP_FIELDS[step];
    setTouched((t) => ({ ...t, ...Object.fromEntries(fields.map((f) => [f, true])) }));
    const firstError = fields.map((f) => errors[f]).find(Boolean);
    if (firstError) {
      push('error', firstError);
      return;
    }
    if (step === 0) {
      if (documentNumberAvailability === 'checking') {
        push('error', 'Aguarde a verificação do número de documento.');
        return;
      }
      if (documentNumberAvailability === 'taken') {
        push('error', 'Já existe um cliente registado com este número de documento.');
        return;
      }
    }
    if (step === 1) {
      if (phoneAvailability === 'checking') {
        push('error', 'Aguarde a verificação do número de telemóvel.');
        return;
      }
      if (phoneAvailability === 'taken') {
        push('error', 'Já existe um cliente registado com este número de telemóvel.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const allFields = STEP_FIELDS.flat() as (keyof RegisterFormState)[];
    setTouched((t) => ({ ...t, ...Object.fromEntries(allFields.map((f) => [f, true])) }));
    const firstError = allFields.map((f) => errors[f]).find(Boolean);
    if (firstError) {
      push('error', firstError);
      return;
    }
    if (!identifierCheck || identifierCheck.checking) {
      push('error', 'Aguarde a verificação do identificador de acesso.');
      return;
    }
    if (!identifierCheck.valid || !identifierCheck.available) {
      push('error', 'O identificador de acesso escolhido não está disponível.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...buildRegisterPayload(form), dependents: dependents.filter((d) => d.firstName) };
      const result = await onSubmit(payload);
      onSuccess(result);
    } catch (err) {
      push('error', apiErrorMessage(err, errorFallback));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('mx-auto max-w-4xl px-4', compact ? 'py-2' : 'py-16')}>
      <div className="mb-8 text-center">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">{eyebrow}</p>}
        <h1 className={cn('text-3xl font-semibold tracking-tight text-slate-900', eyebrow && 'mt-3')}>{title}</h1>
        {description && <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>}
      </div>

      {/* Stepper header */}
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-normal transition-all',
                    done && 'bg-emerald-900 text-white',
                    active && 'border border-emerald-900 text-emerald-900',
                    !done && !active && 'bg-slate-100 text-slate-400',
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                <span className={cn('hidden text-sm font-light sm:block', active || done ? 'text-slate-900' : 'text-slate-400')}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-3 h-px flex-1 bg-slate-200">
                  <div
                    className="h-full bg-emerald-900 transition-all duration-500"
                    style={{ width: done ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-sm">
        <CardContent key={step} className="step-enter space-y-6 p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <SectionHeading icon={UserRound} title="Identificação" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField label="Nome" required error={fieldError('firstName')}>
                  <Input value={form.firstName} onBlur={() => touch('firstName')} onChange={(e) => update('firstName', e.target.value)} />
                </FormField>
                <FormField label="Sobrenome" required error={fieldError('lastName')}>
                  <Input value={form.lastName} onBlur={() => touch('lastName')} onChange={(e) => update('lastName', e.target.value)} />
                </FormField>
                <FormField label="Nacionalidade" required error={fieldError('nationality')}>
                  <Select value={form.nationality} onBlur={() => touch('nationality')} onChange={(e) => update('nationality', e.target.value)}>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Província de Naturalidade" required error={fieldError('placeOfBirthProvince')}>
                  <Select
                    value={form.placeOfBirthProvince}
                    onBlur={() => touch('placeOfBirthProvince')}
                    onChange={(e) => updateBirthProvince(e.target.value)}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Distrito de Naturalidade" required error={fieldError('placeOfBirthDistrict')}>
                  <Select
                    value={form.placeOfBirthDistrict}
                    onBlur={() => touch('placeOfBirthDistrict')}
                    onChange={(e) => update('placeOfBirthDistrict', e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {PROVINCE_DISTRICTS[form.placeOfBirthProvince as keyof typeof PROVINCE_DISTRICTS]?.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Estado Civil">
                  <Select value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
                    <option value="SOLTEIRO">Solteiro(a)</option>
                    <option value="CASADO">Casado(a)</option>
                    <option value="DIVORCIADO">Divorciado(a)</option>
                    <option value="VIUVO">Viúvo(a)</option>
                    <option value="UNIAO_DE_FACTO">União de Facto</option>
                  </Select>
                </FormField>
                <FormField label="Data de Nascimento" required error={fieldError('birthDate')}>
                  <DateField max={TODAY} value={form.birthDate} onBlur={() => touch('birthDate')} onChange={(v) => update('birthDate', v)} />
                </FormField>
                <FormField label="Tipo de Documento" required>
                  <Select value={form.documentType} onChange={(e) => update('documentType', e.target.value)}>
                    <option value="BI">Bilhete de Identidade</option>
                    <option value="PASSAPORTE">Passaporte</option>
                  </Select>
                </FormField>
                <FormField
                  label="Número do Documento"
                  required
                  error={
                    fieldError('documentNumber') ||
                    (touched.documentNumber && documentNumberAvailability === 'taken'
                      ? 'Já existe um cliente registado com este número de documento.'
                      : undefined)
                  }
                  hint={
                    documentNumberAvailability === 'checking'
                      ? 'A verificar disponibilidade...'
                      : documentNumberAvailability === 'available'
                        ? 'Número disponível.'
                        : documentNumberHint(form.documentType)
                  }
                >
                  <Input value={form.documentNumber} onBlur={() => touch('documentNumber')} onChange={(e) => update('documentNumber', e.target.value.toUpperCase())} />
                </FormField>
                <FormField label="Data de Emissão">
                  <DateField max={TODAY} value={form.issueDate} onChange={(v) => update('issueDate', v)} />
                </FormField>
                <FormField label="Data de Validade" error={fieldError('expiryDate')}>
                  <DateField value={form.expiryDate} onBlur={() => touch('expiryDate')} onChange={(v) => update('expiryDate', v)} />
                </FormField>
              </div>

              <SectionHeading icon={IdCard} title="Cópia do Documento" />
              <FormField label="Cópia do Documento (BI ou Passaporte)" required error={fieldError('documentImage')}>
                <FileUploadField
                  value={form.documentImage}
                  onChange={(doc) => {
                    touch('documentImage');
                    setForm((f) => ({ ...f, documentImage: doc }));
                  }}
                />
              </FormField>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <SectionHeading icon={MapPin} title="Contacto & Endereço" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  label="Telefone"
                  required
                  error={
                    fieldError('phone') ||
                    (touched.phone && phoneAvailability === 'taken'
                      ? 'Já existe um cliente registado com este número de telemóvel.'
                      : undefined)
                  }
                  hint={
                    phoneAvailability === 'checking'
                      ? 'A verificar disponibilidade...'
                      : phoneAvailability === 'available'
                        ? 'Número disponível.'
                        : undefined
                  }
                >
                  <PhoneInput value={form.phone} onBlur={() => touch('phone')} onChange={(v) => update('phone', v)} />
                </FormField>
                <FormField label="Telefone Alternativo" error={fieldError('alternativePhone')}>
                  <PhoneInput value={form.alternativePhone} onBlur={() => touch('alternativePhone')} onChange={(v) => update('alternativePhone', v)} />
                </FormField>
                <FormField label="Província" required error={fieldError('province')}>
                  <Select value={form.province} onBlur={() => touch('province')} onChange={(e) => updateAddressProvince(e.target.value)}>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Distrito" required error={fieldError('district')}>
                  <Select value={form.district} onBlur={() => touch('district')} onChange={(e) => update('district', e.target.value)}>
                    <option value="">Seleccione...</option>
                    {PROVINCE_DISTRICTS[form.province as keyof typeof PROVINCE_DISTRICTS]?.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Bairro/Avenida/Rua" required error={fieldError('neighborhood')} hint="Comece a escrever para ver sugestões de endereços em Moçambique">
                  <AddressAutocomplete
                    value={form.neighborhood}
                    onBlur={() => touch('neighborhood')}
                    onChange={(v) => update('neighborhood', v)}
                    onSelect={handleAddressSuggestion}
                  />
                </FormField>
                <FormField label="Endereço adicional">
                  <Input value={form.addressLine} onChange={(e) => update('addressLine', e.target.value)} />
                </FormField>
                <FormField label="Quarteirão (Q.)">
                  <Input value={form.block} onChange={(e) => update('block', e.target.value)} />
                </FormField>
                <FormField label="Casa nº">
                  <Input value={form.houseNumber} onChange={(e) => update('houseNumber', e.target.value)} />
                </FormField>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <SectionHeading icon={Wallet} title="Plano de Assistência Funerária" />

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Frequência de Pagamento <span className="ml-0.5 text-emerald-700">*</span>
                </label>
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => update('paymentFrequency', f.value)}
                      className={cn(
                        'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                        form.paymentFrequency === f.value
                          ? 'bg-white text-emerald-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {fieldError('planId') && <p className="text-xs font-medium text-rose-600">{fieldError('planId')}</p>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans?.map((p) => {
                  const active = form.planId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        touch('planId');
                        update('planId', p.id);
                      }}
                      className={cn(
                        'rounded-xl border p-5 text-left transition-all',
                        active
                          ? 'border-2 border-emerald-900 bg-emerald-50/30 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-slate-900">{p.displayName}</h4>
                        {active && <Check className="h-4 w-4 shrink-0 text-emerald-900" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{p.urnDescription}</p>
                      <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Cobertura</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatMoney(p.coverageMin)}
                        {p.coverageMax ? ` – ${formatMoney(p.coverageMax)}` : ''}
                      </p>
                      <p className="mt-3 text-lg font-bold text-emerald-900">
                        {formatMoney(feeForFrequency(p, form.paymentFrequency))}
                        <span className="text-xs font-normal text-slate-400"> /{FREQUENCIES.find((f) => f.value === form.paymentFrequency)?.label.toLowerCase()}</span>
                      </p>
                    </button>
                  );
                })}
              </div>

              <FormField label="Duração do Contrato" required className="max-w-xs">
                <Select value={form.durationMonths} onChange={(e) => update('durationMonths', Number(e.target.value))}>
                  <option value={12}>12 meses</option>
                  <option value={24}>24 meses</option>
                  <option value={48}>48 meses</option>
                </Select>
              </FormField>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <SectionHeading icon={Baby} title="Dependentes" />
                <p className="mt-2 text-sm text-slate-500">
                  Adicione os beneficiários/dependentes que farão parte do seu plano (opcional nesta fase; pode
                  adicionar mais tarde pelo Portal do Cliente).
                </p>

                {dependents.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50/80">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nome</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Parentesco</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nascimento</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {dependents.map((dep, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-3.5 font-medium text-slate-700">{dep.firstName} {dep.lastName}</td>
                            <td className="px-4 py-3.5 text-slate-700">{dep.relationship}</td>
                            <td className="px-4 py-3.5 text-slate-700">{dep.birthDate || '-'}</td>
                            <td className="px-4 py-3.5 text-right">
                              <button type="button" onClick={() => removeDependent(i)} className="text-slate-400 hover:text-rose-600">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button type="button" variant="outline" className="mt-4" onClick={() => setDepModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Adicionar Dependente
                </Button>
              </div>

              <div>
                <SectionHeading icon={Wallet} title="Resumo de Cobrança" />
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-sm">
                  <SummaryRow label="Plano seleccionado" value={selectedPlan?.displayName ?? '-'} />
                  <SummaryRow
                    label={`Prestação (${FREQUENCIES.find((f) => f.value === form.paymentFrequency)?.label ?? ''})`}
                    value={formatMoney(feeForFrequency(selectedPlan, form.paymentFrequency))}
                  />
                  <SummaryRow label="Duração do contrato" value={`${form.durationMonths} meses`} />
                  <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
                    <span className="font-medium text-slate-700">Taxa de adesão (10%, paga agora)</span>
                    <strong className="text-lg font-bold text-amber-700">{formatMoney(membershipFee)}</strong>
                  </div>
                </div>
              </div>

              <div>
                <SectionHeading icon={KeyRound} title="Credenciais de Acesso" />
                <p className="mt-2 text-sm text-slate-500">
                  Vai usar este identificador para entrar no Portal do Cliente. Sugerimos um a partir do seu nome —
                  pode alterá-lo se preferir.
                </p>
                <div className="mt-4 max-w-sm">
                  <FormField label="Utilizador" required>
                    <Input
                      value={form.identifier}
                      invalid={!!fieldError('identifier') || (!!identifierCheck && !identifierCheck.checking && (!identifierCheck.valid || !identifierCheck.available))}
                      onChange={(e) => {
                        setIdentifierEdited(true);
                        update('identifier', e.target.value);
                      }}
                      onBlur={() => touch('identifier')}
                    />
                  </FormField>
                  {fieldError('identifier') && <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldError('identifier')}</p>}
                  {!fieldError('identifier') && identifierCheck && (
                    <p
                      className={cn(
                        'mt-1.5 flex items-center gap-1.5 text-xs font-medium',
                        identifierCheck.checking
                          ? 'text-slate-400'
                          : identifierCheck.valid && identifierCheck.available
                            ? 'text-emerald-700'
                            : 'text-rose-600',
                      )}
                    >
                      {identifierCheck.checking ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> A verificar disponibilidade...
                        </>
                      ) : !identifierCheck.valid ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Só letras, números, pontos, hífenes e underscores (mín. 3 caracteres).
                        </>
                      ) : !identifierCheck.available ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Este identificador já está em uso. Escolha outro.
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Utilizador disponível.
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={goBack} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={goNext}>
            Continuar <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting} size="lg">
            {submitLabel}
          </Button>
        )}
      </div>

      <AddDependentModal
        open={depModalOpen}
        onClose={() => setDepModalOpen(false)}
        existingDependents={dependents}
        clientBirthDate={form.birthDate}
        onAdd={(dep) => {
          setDependents((d) => [...d, dep]);
          setDepModalOpen(false);
        }}
      />
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <Icon className="h-3.5 w-3.5 text-amber-600" />
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{title}</h3>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function AddDependentModal({
  open,
  onClose,
  onAdd,
  existingDependents,
  clientBirthDate,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (dep: DependentInput) => void;
  existingDependents: DependentInput[];
  clientBirthDate?: string;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const reset = () => {
    setFirstName('');
    setLastName('');
    setRelationship('');
    setBirthDate('');
  };

  const blocked = relationshipAlreadyTaken(existingDependents as { relationship: string }[], relationship);
  const birthDateError = relationship ? dependentBirthDateError(relationship, birthDate, clientBirthDate) : null;
  const birthDateRequired = relationship === 'Pai' || relationship === 'Mãe' || relationship === 'Cônjuge';

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Adicionar Dependente"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nome" required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormField>
          <FormField label="Apelido" required>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Grau de Parentesco" required>
          <Select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            <option value="">Seleccione...</option>
            {RELATIONSHIPS.map((r) => (
              <option
                key={r}
                value={r}
                disabled={relationshipAlreadyTaken(existingDependents as { relationship: string }[], r)}
              >
                {r}
              </option>
            ))}
          </Select>
          {blocked && <p className="mt-1.5 text-xs text-rose-600">{relationshipLimitMessage(relationship)}</p>}
        </FormField>
        <FormField label="Data de Nascimento" required={birthDateRequired} error={birthDateError}>
          <DateField max={TODAY} value={birthDate} onChange={setBirthDate} />
        </FormField>
        <Button
          className="w-full"
          disabled={!firstName || !lastName || !relationship || blocked || !!birthDateError}
          onClick={() => {
            onAdd({ firstName, lastName, relationship, birthDate });
            reset();
          }}
        >
          Adicionar
        </Button>
      </div>
    </Modal>
  );
}
