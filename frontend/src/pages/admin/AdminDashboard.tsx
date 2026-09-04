import { useQuery, useMutation } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Ban, RefreshCcw, Users, Wallet, Clock } from 'lucide-react';
import { DashboardApi } from '@/api/endpoints';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/utils';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TONE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: keyof typeof TONE_CLASSES;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: kpis } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: DashboardApi.kpis });
  const { data: series } = useQuery({
    queryKey: ['revenue-series'],
    queryFn: () => DashboardApi.revenueSeries(new Date().getFullYear()),
  });
  const { push } = useToast();

  const runCheck = useMutation({
    mutationFn: DashboardApi.runDelinquencyCheck,
    onSuccess: (summary: any) =>
      push(
        'success',
        `Verificação concluída: ${summary.markedLate} em atraso, ${summary.suspended} suspensos, ${summary.terminated} rescindidos.`,
      ),
  });

  const chartData = series?.map((s) => ({ name: MONTH_LABELS[s.month - 1], total: s.total }));

  return (
    <div>
      <PageHeader
        title="Dashboard de Gestão"
        description="Visão geral da Agência Funerária Espírito Santo"
        action={
          <Button variant="outline" onClick={() => runCheck.mutate()} loading={runCheck.isPending}>
            <RefreshCcw className="h-4 w-4" /> Executar Verificação de Inadimplência
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard icon={Users} label="Total de Clientes" value={!kpis ? '-' : kpis.totalClients} tone="emerald" />
        <KpiCard
          icon={Wallet}
          label={`Receita de ${kpis?.currentMonthReference ?? ''}`}
          value={!kpis ? '-' : formatMoney(kpis.monthlyRevenue)}
          tone="emerald"
        />
        <KpiCard icon={Users} label="Clientes Activos" value={!kpis ? '-' : kpis.activeClients} tone="emerald" />
        <KpiCard icon={Clock} label="Clientes em Carência" value={!kpis ? '-' : kpis.gracePeriodClients} tone="amber" />
        <KpiCard
          icon={AlertTriangle}
          label="Inadimplentes este Mês"
          value={!kpis ? '-' : kpis.delinquentThisMonth}
          tone="amber"
        />
        <KpiCard icon={Ban} label="Contratos Suspensos" value={!kpis ? '-' : kpis.suspendedContracts} tone="rose" />
      </div>

      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>Receita Mensal ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Bar dataKey="total" fill="#065f46" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
