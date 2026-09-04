import { useEffect, useRef, useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/Input';
import { PaymentsApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/utils';

type Phase = 'form' | 'waiting' | 'success' | 'failed';

export function MobileMoneyPaymentModal({
  open,
  onClose,
  contractId,
  installmentId,
  amountLabel,
  defaultPhone,
  onSuccess,
  initiate = PaymentsApi.initiateMobileMoney,
  title = 'Pagamento via Carteira Móvel',
}: {
  open: boolean;
  onClose: () => void;
  contractId: string;
  installmentId?: string;
  amountLabel: string;
  defaultPhone?: string;
  onSuccess?: () => void;
  /** Substitui o endpoint usado para iniciar o pedido (ex: cobrança feita pelo agente em nome do cliente). */
  initiate?: typeof PaymentsApi.initiateMobileMoney;
  title?: string;
}) {
  const [method, setMethod] = useState<'MPESA' | 'EMOLA'>('MPESA');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [phase, setPhase] = useState<Phase>('form');
  const [message, setMessage] = useState('');
  const { push } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (open) {
      setPhase('form');
      setPhone(defaultPhone ?? '');
    }
    return () => clearInterval(pollRef.current);
  }, [open, defaultPhone]);

  const submit = async () => {
    setPhase('waiting');
    try {
      const res = await initiate(contractId, method, phone, installmentId);
      setMessage(res.message);
      pollRef.current = setInterval(async () => {
        const status = await PaymentsApi.status(res.paymentId);
        if (status.status === 'COMPLETED') {
          clearInterval(pollRef.current);
          setPhase('success');
          push('success', 'Pagamento confirmado com sucesso!');
          onSuccess?.();
        } else if (status.status === 'FAILED') {
          clearInterval(pollRef.current);
          setPhase('failed');
          setMessage(status.notes ?? 'O pagamento não foi confirmado.');
        }
      }, 1800);
    } catch (err) {
      setPhase('failed');
      setMessage(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {phase === 'form' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Valor a pagar: <strong className="text-slate-900">{amountLabel}</strong>
          </p>
          <FormField label="Operadora" required>
            <Select value={method} onChange={(e) => setMethod(e.target.value as any)}>
              <option value="MPESA">M-Pesa (Vodacom)</option>
              <option value="EMOLA">e-Mola (Movitel)</option>
            </Select>
          </FormField>
          <FormField label="Número de Telemóvel" required hint="Pode usar o número registado ou qualquer outro número.">
            <Input placeholder="84XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <Button className="w-full" onClick={submit} disabled={!phone}>
            <Smartphone className="h-4 w-4" /> Enviar Pedido de Pagamento
          </Button>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
          <p className="font-medium text-slate-800">Prompt USSD enviado para {phone}</p>
          <p className="text-sm text-slate-500">Confirme o pagamento no seu telemóvel introduzindo o PIN da {method === 'MPESA' ? 'M-Pesa' : 'e-Mola'}.</p>
        </div>
      )}

      {phase === 'success' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</div>
          <p className="font-medium text-slate-800">Pagamento confirmado!</p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      )}

      {phase === 'failed' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-medium text-rose-600">Pagamento não confirmado</p>
          <p className="text-sm text-slate-500">{message}</p>
          <Button variant="outline" onClick={() => setPhase('form')}>
            Tentar Novamente
          </Button>
        </div>
      )}
    </Modal>
  );
}
