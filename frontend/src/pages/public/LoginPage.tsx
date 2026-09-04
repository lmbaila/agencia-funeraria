import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { GlowMesh, GrainOverlay } from '@/components/ui/DecorativeArt';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { apiErrorMessage } from '@/api/client';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      if (user.role === 'CLIENT') {
        navigate('/portal');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        const perms = user.permissions ?? [];
        if (perms.includes('VIEW_DASHBOARD')) navigate('/admin');
        else if (perms.includes('MANAGE_CLIENTS')) navigate('/admin/clientes');
        else if (perms.includes('MANAGE_DELINQUENCY')) navigate('/admin/inadimplencia');
        else if (perms.includes('MANAGE_PAYMENTS')) navigate('/admin/pagamentos');
        else navigate('/admin');
      }
    } catch (err) {
      push('error', apiErrorMessage(err, 'Utilizador ou password incorrectos'));
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
            <HeartHandshake className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Agência Funerária Espírito Santo</h1>
          <p className="mt-1 text-sm text-slate-500">Aceda ao Portal do Cliente ou ao Dashboard de Gestão</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Utilizador</Label>
            <Input
              placeholder="O seu utilizador"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-full" size="lg" loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Ainda não é cliente?{' '}
          <Link to="/adesao" className="font-medium text-emerald-800 hover:underline">
            Aderir a um plano
          </Link>
        </p>
        <p className="mt-2 text-center text-xs">
          <Link to="/" className="text-slate-400 hover:underline">
            Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
