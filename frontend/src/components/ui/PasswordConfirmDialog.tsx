import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthApi } from '@/api/endpoints';
import { Modal } from './Modal';
import { Button, type ButtonProps } from './Button';
import { Input } from './Input';

/**
 * Confirmação por password: usada antes de qualquer acção destrutiva (ex: apagar um
 * dependente). O campo nunca deve ser pré-preenchido pelo browser — por isso o
 * autoComplete="new-password" e o nome fora do padrão habitual de campos de login,
 * a única forma fiável de a maioria dos browsers não sugerir uma password guardada aqui.
 */
export function PasswordConfirmDialog({
  open,
  onClose,
  onConfirmed,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'destructive',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: ButtonProps['variant'];
  /** Estado de loading da acção disparada por onConfirmed (ex: o próprio pedido de remoção). */
  loading?: boolean;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () => AuthApi.verifyPassword(password),
    onSuccess: () => {
      setError(null);
      setPassword('');
      onConfirmed();
    },
    onError: () => setError('Password incorrecta.'),
  });

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          verifyMutation.mutate();
        }}
      >
        <p className="text-sm text-slate-600">{description}</p>
        <div>
          <Input
            type="password"
            autoFocus
            autoComplete="new-password"
            name="confirm-action-password"
            placeholder="Introduza a sua password"
            invalid={!!error}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            required
          />
          {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant={variant} loading={verifyMutation.isPending || loading}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
