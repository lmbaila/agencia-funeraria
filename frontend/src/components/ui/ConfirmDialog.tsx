import { Modal } from './Modal';
import { Button, type ButtonProps } from './Button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonProps['variant'];
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <p className="text-sm text-slate-600">{description}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} className="flex-1" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
