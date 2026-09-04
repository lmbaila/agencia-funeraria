import { useState, type FormEvent } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { GlowMesh, GrainOverlay } from '@/components/ui/DecorativeArt';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { AuthApi } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';

/**
 * Bloqueia o acesso ao resto da aplicação até a password temporária ser substituída —
 * aplica-se tanto a clientes recém-registados como a agentes recém-criados.
 */
export default function ForcePasswordChangeScreen() {
  const { setMustChangePassword, logout, lastLoginPassword, clearLastLoginPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState(lastLoginPassword ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      push('error', 'A nova password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      push('error', 'As passwords não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await AuthApi.changePassword(currentPassword, newPassword);
      push('success', 'Password alterada com sucesso.');
      clearLastLoginPassword();
      setMustChangePassword(false);
    } catch (err) {
      push('error', apiErrorMessage(err, 'Não foi possível alterar a password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-emerald-950 px-4">
      <GlowMesh className="absolute inset-0" />
      <GrainOverlay className="absolute inset-0 h-full w-full" />

      <div className="relative w-full max-w-sm rounded-2xl bg-white p-9 shadow-2xl shadow-black/20">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-950 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Defina a sua password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Está a usar uma password temporária. Antes de continuar, defina uma password só sua.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Password Temporária</Label>
            <Input
              type="password"
              placeholder="A password que lhe foi entregue"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label>Nova Password</Label>
            <Input
              type="password"
              placeholder="Pelo menos 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <Label>Confirmar Nova Password</Label>
            <Input
              type="password"
              placeholder="Repita a nova password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-full" size="lg" loading={loading}>
            Guardar e Continuar
          </Button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>
    </div>
  );
}
