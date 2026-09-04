import { type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { HeartHandshake, LogOut, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENT: 'Agente',
  CLIENT: 'Cliente',
};

export function DashboardShell({ navItems, title }: { navItems: NavItem[]; title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 md:flex">
        <Link to="/" className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-white">Espírito Santo</p>
            <p className="text-xs text-slate-400">{title}</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100',
                  isActive && 'border border-emerald-700/50 bg-emerald-900/60 font-semibold text-white shadow-inner',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
              {(user?.identifier ?? '?').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">{user?.identifier}</p>
              <p className="text-xs text-slate-400">{user?.role ? ROLE_LABEL[user.role] : ''}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sair"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 md:hidden">
          <span className="font-semibold tracking-tight text-emerald-900">Espírito Santo</span>
          <button onClick={handleLogout} className="text-sm text-slate-500">
            Sair
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
