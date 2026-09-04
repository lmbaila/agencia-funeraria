import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, Wallet, UserCircle2, PiggyBank, ShieldCheck, Settings, Package } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import ForcePasswordChangeScreen from '@/components/auth/ForcePasswordChangeScreen';
import type { Permission } from '@/types';

import LandingPage from '@/pages/public/LandingPage';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import RegisterSuccessPage from '@/pages/public/RegisterSuccessPage';
import PayViaLinkPage from '@/pages/public/PayViaLinkPage';
import ClaimReportPage from '@/pages/public/ClaimReportPage';

import ClientDashboard from '@/pages/client/ClientDashboard';
import ClientDependents from '@/pages/client/ClientDependents';
import ClientPayments from '@/pages/client/ClientPayments';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminClients from '@/pages/admin/AdminClients';
import AdminClientCreate from '@/pages/admin/AdminClientCreate';
import AdminClientDetail from '@/pages/admin/AdminClientDetail';
import AdminDelinquency from '@/pages/admin/AdminDelinquency';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminAgents from '@/pages/admin/AdminAgents';
import AdminPlans from '@/pages/admin/AdminPlans';
import AdminSettings from '@/pages/admin/AdminSettings';

/**
 * O router não repõe o scroll ao mudar de página (é uma SPA, não há reload). Sem isto, ao clicar
 * num link a partir de um ponto qualquer da Landing Page (ex: "Aderir Agora" no cabeçalho fixo),
 * a página seguinte abriria à mesma posição de scroll em vez de mostrar o formulário desde o topo.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

const clientNav = [
  { to: '/portal', label: 'Meu Plano', icon: LayoutDashboard, end: true },
  { to: '/portal/dependentes', label: 'Dependentes', icon: Users },
  { to: '/portal/pagamentos', label: 'Pagamentos', icon: Wallet },
];

interface AdminNavItem extends NavItem {
  permission?: Permission;
  adminOnly?: boolean;
}

const adminNavConfig: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'VIEW_DASHBOARD' },
  { to: '/admin/clientes', label: 'Clientes', icon: UserCircle2, permission: 'MANAGE_CLIENTS' },
  { to: '/admin/inadimplencia', label: 'Inadimplência', icon: AlertTriangle, permission: 'MANAGE_DELINQUENCY' },
  { to: '/admin/pagamentos', label: 'Pagamentos', icon: PiggyBank, permission: 'MANAGE_PAYMENTS' },
  { to: '/admin/agentes', label: 'Agentes', icon: ShieldCheck, adminOnly: true },
  { to: '/admin/planos', label: 'Planos', icon: Package, adminOnly: true },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
];

export default function App() {
  const { user, mustChangePassword } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const adminNav = adminNavConfig.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (isAdmin) return true;
    return item.permission ? (user?.permissions ?? []).includes(item.permission) : true;
  });

  if (user && mustChangePassword) {
    return <ForcePasswordChangeScreen />;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Público */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/adesao" element={<RegisterPage />} />
          <Route path="/adesao/sucesso" element={<RegisterSuccessPage />} />
          <Route path="/comunicar-obito" element={<ClaimReportPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pagar/:token" element={<PayViaLinkPage />} />

        {/* Portal do Cliente */}
        <Route element={<ProtectedRoute roles={['CLIENT']} />}>
          <Route element={<DashboardShell navItems={clientNav} title="Portal do Cliente" />}>
            <Route path="/portal" element={<ClientDashboard />} />
            <Route path="/portal/dependentes" element={<ClientDependents />} />
            <Route path="/portal/pagamentos" element={<ClientPayments />} />
          </Route>
        </Route>

        {/* Dashboard Administrativo */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'AGENT']} />}>
          <Route element={<DashboardShell navItems={adminNav} title="Dashboard de Gestão" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/clientes" element={<AdminClients />} />
            <Route path="/admin/clientes/novo" element={<AdminClientCreate />} />
            <Route path="/admin/clientes/:id" element={<AdminClientDetail />} />
            <Route path="/admin/inadimplencia" element={<AdminDelinquency />} />
            <Route path="/admin/pagamentos" element={<AdminPayments />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin/agentes" element={<AdminAgents />} />
              <Route path="/admin/planos" element={<AdminPlans />} />
              <Route path="/admin/configuracoes" element={<AdminSettings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
