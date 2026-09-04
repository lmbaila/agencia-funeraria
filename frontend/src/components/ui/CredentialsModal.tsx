import { Copy, Download } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from './Toast';
import { downloadCredentialsFile } from '@/lib/credentials';

export function CredentialsModal({
  open,
  onClose,
  title,
  description,
  identifier,
  password,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  identifier: string;
  password: string;
}) {
  const { push } = useToast();
  const copy = () => {
    navigator.clipboard.writeText(`Utilizador: ${identifier}\nPassword: ${password}`);
    push('success', 'Credenciais copiadas.');
  };
  const download = () => {
    downloadCredentialsFile(identifier, password);
    push('success', 'Credenciais transferidas.');
  };
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{description}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Utilizador</p>
            <p className="mt-1.5 text-base font-semibold text-emerald-950">{identifier}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Password Temporária</p>
            <p className="mt-1.5 text-base font-semibold text-amber-700">{password}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button variant="outline" onClick={download}>
            <Download className="h-4 w-4" /> Transferir
          </Button>
        </div>
        <Button className="w-full" onClick={onClose}>
          Concluído
        </Button>
      </div>
    </Modal>
  );
}
