import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, FileText, HeartHandshake, ShieldCheck } from 'lucide-react';
import { PublicClaimsApi, UploadsApi, type UploadedDocument } from '@/api/endpoints';
import type { PublicClaimLookupResult, InsuredPerson } from '@/types';
import { apiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FormField, Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { FileUploadField } from '@/components/ui/FileUploadField';
import { cn } from '@/lib/utils';

const TODAY = new Date().toISOString().slice(0, 10);

type Step = 'identity' | 'select' | 'requester' | 'done';

function StepLabel({ current, total }: { current: number; total: number }) {
  return <span className="text-xs font-medium text-slate-400">Passo {current} de {total}</span>;
}

export default function ClaimReportPage() {
  const [step, setStep] = useState<Step>('identity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentNumber, setDocumentNumber] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [name, setName] = useState('');

  const [lookupResult, setLookupResult] = useState<PublicClaimLookupResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateOfDeath, setDateOfDeath] = useState('');
  const [notes, setNotes] = useState('');
  const [deathCertificate, setDeathCertificate] = useState<UploadedDocument | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterRelationship, setRequesterRelationship] = useState('');

  const [requestBatchId, setRequestBatchId] = useState<string | null>(null);

  const toggleSelected = (person: InsuredPerson) => {
    if (person.hasPendingRequest) return;
    setSelectedIds((ids) => (ids.includes(person.id) ? ids.filter((x) => x !== person.id) : [...ids, person.id]));
  };

  const handleLookup = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await PublicClaimsApi.lookup({ documentNumber, phoneLast4, name });
      setLookupResult(result);
      setStep('select');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível confirmar os dados. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!lookupResult) return;
    setError(null);
    setLoading(true);
    try {
      const selections = lookupResult.insuredPersons
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => ({
          beneficiaryType: p.type,
          dependentId: p.type === 'DEPENDENT' ? p.id : undefined,
        }));
      const res = await PublicClaimsApi.request({
        documentNumber,
        phoneLast4,
        name,
        selections,
        dateOfDeath,
        notes: notes || undefined,
        deathCertificatePath: deathCertificate?.path,
        deathCertificateMimeType: deathCertificate?.mimeType,
        requesterName,
        requesterPhone,
        requesterRelationship,
      });
      setRequestBatchId(res.requestBatchId);
      setStep('done');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível submeter a comunicação. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div className="lg:sticky lg:top-24">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">Comunicação de Óbito</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Estamos consigo neste momento</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Sentimos muito pela vossa perda. Este espaço permite ao titular ou a um familiar comunicar-nos, com
            discrição e respeito, o falecimento de uma pessoa segura, para darmos início ao processo de activação da
            cobertura.
          </p>
        </div>

        <div>
          {step === 'identity' && (
            <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-sm">
              <CardContent className="space-y-5 p-8">
                <div className="flex justify-end">
                  <StepLabel current={1} total={3} />
                </div>
                <p className="text-sm text-slate-600">
                  Para sua segurança e da família, precisamos primeiro de confirmar alguns dados do titular da apólice.
                </p>

                <FormField label="Número de Documento do Titular (BI ou Passaporte)" required>
                  <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Ex: 110100123456A" />
                </FormField>

                <FormField label="Últimos 4 dígitos do telemóvel do titular" required hint="O número de telemóvel associado à apólice.">
                  <Input
                    value={phoneLast4}
                    onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="Ex: 4567"
                    className="max-w-[140px] tracking-widest"
                  />
                </FormField>

                <FormField
                  label="Nome do titular ou de um dos dependentes seguros"
                  required
                  hint="Não precisa de ser exacto, escreva como se lembrar."
                >
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
                </FormField>

                {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleLookup}
                  disabled={!documentNumber.trim() || phoneLast4.length !== 4 || !name.trim()}
                  loading={loading}
                >
                  Continuar
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'select' && lookupResult && (
            <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-sm">
              <CardContent className="space-y-5 p-8">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setStep('identity')}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                  <StepLabel current={2} total={3} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Apólice {lookupResult.contractNumber} · {lookupResult.clientName}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Quem gostaria de comunicar?</h2>
                  <p className="mt-1 text-sm text-slate-500">Pode seleccionar mais do que uma pessoa, se for o caso.</p>
                </div>

                <div className="space-y-2">
                  {lookupResult.insuredPersons.map((person) => (
                    <label
                      key={person.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                        person.hasPendingRequest
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                          : selectedIds.includes(person.id)
                            ? 'border-emerald-800 bg-emerald-50/50'
                            : 'border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(person.id)}
                          onChange={() => toggleSelected(person)}
                          disabled={person.hasPendingRequest}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800/20"
                        />
                        <span>
                          <span className="font-medium text-slate-800">{person.name}</span>{' '}
                          <span className="text-slate-400">({person.relationship})</span>
                        </span>
                      </span>
                      {person.hasPendingRequest && <span className="text-xs text-amber-600">Pedido já em análise</span>}
                    </label>
                  ))}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Data do falecimento" required>
                    <DateField max={TODAY} value={dateOfDeath} onChange={setDateOfDeath} />
                  </FormField>
                  <FormField label="Observações (opcional)">
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Circunstâncias, se relevante" />
                  </FormField>
                </div>

                <FormField
                  label="Certidão de Óbito (opcional)"
                  hint="Se já tiver uma cópia digitalizada ou fotografada, pode anexá-la agora. Caso contrário, poderá apresentá-la presencialmente na agência."
                >
                  <FileUploadField value={deathCertificate} onChange={setDeathCertificate} uploadFn={UploadsApi.uploadClaimDocument} />
                </FormField>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setStep('requester')}
                  disabled={selectedIds.length === 0 || !dateOfDeath}
                >
                  Continuar
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'requester' && lookupResult && (
            <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-sm">
              <CardContent className="space-y-5 p-8">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setStep('select')}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                  <StepLabel current={3} total={3} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Os seus dados de contacto</h2>
                  <p className="mt-1 text-sm text-slate-500">Para que um agente possa contactá-lo(a), se necessário.</p>
                </div>

                <FormField label="O seu nome" required>
                  <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
                </FormField>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="O seu telemóvel" required>
                    <Input
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="84xxxxxxx"
                    />
                  </FormField>
                  <FormField label="Relação com o(a) falecido(a)" required>
                    <Input
                      value={requesterRelationship}
                      onChange={(e) => setRequesterRelationship(e.target.value)}
                      placeholder="Ex: Filho(a), Cônjuge"
                    />
                  </FormField>
                </div>

                {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitRequest}
                  disabled={!requesterName.trim() || requesterPhone.trim().length < 9 || !requesterRelationship.trim()}
                  loading={loading}
                >
                  Submeter Comunicação
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'done' && requestBatchId && (
            <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-sm">
              <CardContent className="space-y-6 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Comunicação recebida</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                    Obrigado por partilhar esta informação connosco, e mais uma vez as nossas condolências. A sua
                    comunicação foi registada e aguarda confirmação presencial numa das nossas agências.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-5 text-left text-sm leading-relaxed text-slate-600">
                  <p className="mb-2 flex items-center gap-2 font-medium text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" /> Próximo passo
                  </p>
                  Dirija-se a uma das nossas agências, preferencialmente nos próximos dias úteis
                  {deathCertificate ? '' : ', com a Certidão de Óbito'}, o documento de identificação do(a)
                  falecido(a) (se disponível) e o seu documento de identificação. Um agente irá confirmar os dados
                  consigo e emitir o Termo de Sinistro.
                  {deathCertificate && (
                    <span className="mt-2 block font-medium text-emerald-700">
                      A certidão de óbito que anexou já foi recebida.
                    </span>
                  )}
                </div>

                <a href={PublicClaimsApi.comprovativoUrl(requestBatchId)} target="_blank" rel="noreferrer">
                  <Button className="w-full" size="lg">
                    <FileText className="h-4 w-4" /> Descarregar Comprovativo
                  </Button>
                </a>

                <Link to="/" className="block text-sm text-slate-400 underline">
                  Voltar à página inicial
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
