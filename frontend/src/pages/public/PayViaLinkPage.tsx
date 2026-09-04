import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, HeartHandshake, Loader2, Smartphone } from 'lucide-react';
import { PaymentLinksApi, type PaymentLinkInfo } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FormField, Select } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { GlowMesh, GrainOverlay } from '@/components/ui/DecorativeArt';
import { formatMoney } from '@/lib/utils';

type Phase = 'loading' | 'error' | 'form' | 'waiting' | 'success' | 'failed';

export default function PayViaLinkPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [info, setInfo] = useState<PaymentLinkInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [method, setMethod] = useState<'MPESA' | 'EMOLA'>('MPESA');
  const [phone, setPhone] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!token) return;
    PaymentLinksApi.getInfo(token)
      .then((res) => {
        setInfo(res);
        setPhone(res.clientPhone?.replace(/\D/g, '').slice(-9) ?? '');
        setPhase('form');
      })
      .catch((err) => {
        setErrorMessage(apiErrorMessage(err, 'Este link de pagamento não é válido.'));
        setPhase('error');
      });
    return () => clearInterval(pollRef.current);
  }, [token]);

  const submit = async () => {
    if (!token) return;
    setPhase('waiting');
    try {
      const res = await PaymentLinksApi.pay(token, method, phone);
      setStatusMessage(res.message);
      pollRef.current = setInterval(async () => {
        const status = await PaymentLinksApi.status(token);
        if (status.status === 'COMPLETED') {
          clearInterval(pollRef.current);
          setPhase('success');
        } else if (status.status === 'FAILED') {
          clearInterval(pollRef.current);
          setPhase('failed');
          setStatusMessage(status.notes ?? 'O pagamento não foi confirmado.');
        }
      }, 1800);
    } catch (err) {
      setPhase('failed');
      setStatusMessage(apiErrorMessage(err));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-emerald-950 px-4 py-10">
      <GlowMesh className="absolute inset-0" />
      <GrainOverlay className="absolute inset-0 h-full w-full" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-950 text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Agência Funerária Espírito Santo</p>
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            <p className="text-sm text-slate-500">A carregar dados do pagamento...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-medium text-rose-600">Link inválido</p>
            <p className="text-sm text-slate-500">{errorMessage}</p>
          </div>
        )}

        {info && phase === 'form' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center">
              <p className="text-sm text-slate-500">Olá, {info.clientName.split(' ')[0]}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {info.type === 'MEMBERSHIP_FEE' ? 'Taxa de Adesão' : `Mensalidade de ${info.monthReference}`}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatMoney(info.amount)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {info.planName} · Contrato {info.contractNumber}
              </p>
            </div>

            <FormField label="Operadora" required>
              <Select value={method} onChange={(e) => setMethod(e.target.value as any)}>
                <option value="MPESA">M-Pesa (Vodacom)</option>
                <option value="EMOLA">e-Mola (Movitel)</option>
              </Select>
            </FormField>
            <FormField label="Número de Telemóvel" required>
              <PhoneInput value={phone} onChange={setPhone} />
            </FormField>
            <Button className="w-full" size="lg" onClick={submit} disabled={phone.length !== 9}>
              <Smartphone className="h-4 w-4" /> Pagar Agora
            </Button>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
            <p className="font-medium text-slate-800">Prompt USSD enviado para +258 {phone}</p>
            <p className="text-sm text-slate-500">
              Confirme o pagamento no seu telemóvel introduzindo o PIN da {method === 'MPESA' ? 'M-Pesa' : 'e-Mola'}.
            </p>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="font-medium text-slate-800">Pagamento confirmado com sucesso!</p>
            <p className="text-sm text-slate-500">Obrigado. Já não precisa desta página.</p>
          </div>
        )}

        {phase === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-medium text-rose-600">Pagamento não confirmado</p>
            <p className="text-sm text-slate-500">{statusMessage}</p>
            <Button variant="outline" onClick={() => setPhase('form')}>
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
