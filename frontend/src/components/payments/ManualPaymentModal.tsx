import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Select, Textarea } from '@/components/ui/Input';
import { PaymentsApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useToast } from '@/components/ui/Toast';

export function ManualPaymentModal({
  open,
  onClose,
  contractId,
  installmentId,
  membershipFeePending,
  amountLabel,
}: {
  open: boolean;
  onClose: () => void;
  contractId: string;
  installmentId?: string;
  membershipFeePending: boolean;
  amountLabel: string;
}) {
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const { push } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      PaymentsApi.registerManual({
        contractId,
        installmentId,
        method,
        notes,
      }),
    onSuccess: () => {
      push('success', 'Pagamento registado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['admin-contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      onClose();
    },
    onError: (err) => push('error', apiErrorMessage(err)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Dar Baixa de Pagamento (Balcão)">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {membershipFeePending ? 'Taxa de adesão a regularizar:' : 'Mensalidade a regularizar:'}{' '}
          <strong className="text-slate-900">{amountLabel}</strong>
        </p>
        <FormField label="Método de Pagamento" required>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Dinheiro</option>
            <option value="POS">POS (cartão)</option>
            <option value="BANK_TRANSFER">Transferência BCI</option>
          </Select>
        </FormField>
        <FormField label="Notas (opcional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações sobre este pagamento" />
        </FormField>
        <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
          Confirmar Baixa de Pagamento
        </Button>
      </div>
    </Modal>
  );
}
