import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, Download, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { apiErrorMessage } from '@/api/client';
import { formatMoney } from '@/lib/utils';
import { downloadCredentialsFile } from '@/lib/credentials';
import type { RegisterResponse } from '@/api/endpoints';

export default function RegisterSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const result = location.state as RegisterResponse | undefined;

  if (!result) return <Navigate to="/adesao" replace />;

  const { credentials, membershipFeeAmount } = result;

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Utilizador: ${credentials.identifier}\nPassword: ${credentials.temporaryPassword}`);
    push('success', 'Credenciais copiadas para a área de transferência.');
  };

  const downloadCredentials = () => {
    downloadCredentialsFile(credentials.identifier, credentials.temporaryPassword);
    push('success', 'Credenciais transferidas.');
  };

  const handleContinueToPortal = async () => {
    setLoading(true);
    try {
      await login(credentials.identifier, credentials.temporaryPassword);
      navigate('/portal');
    } catch (err) {
      push('error', apiErrorMessage(err, 'Não foi possível iniciar sessão automaticamente. Use o login manual.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-slate-900">Adesão realizada com sucesso!</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          Guarde as suas credenciais de acesso ao Portal do Cliente. Também poderá alterá-las depois do primeiro
          acesso.
        </p>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-5 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <KeyRound className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">Utilizador</p>
              </div>
              <p className="mt-2 text-lg font-semibold text-emerald-950">{credentials.identifier}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">Password Temporária</p>
              </div>
              <p className="mt-2 text-lg font-semibold text-amber-700">{credentials.temporaryPassword}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-full" onClick={copyCredentials}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button variant="outline" className="rounded-full" onClick={downloadCredentials}>
              <Download className="h-4 w-4" /> Transferir
            </Button>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            Falta apenas pagar a <strong>taxa de adesão de {formatMoney(membershipFeeAmount)}</strong> para activar a
            contagem do período de carência. Poderá pagar via M-Pesa ou e-Mola directamente no Portal do Cliente.
          </div>

          <Button className="w-full rounded-full" size="lg" onClick={handleContinueToPortal} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar no Portal e Pagar Taxa de Adesão
          </Button>
          <p className="text-center text-xs text-slate-400">
            Prefere entrar mais tarde?{' '}
            <Link to="/login" className="underline">
              Ir para o login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
