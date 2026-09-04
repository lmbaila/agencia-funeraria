import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { ClientsApi } from '@/api/endpoints';
import { PageHeader } from '@/components/layout/DashboardShell';
import { Table, TBody, TD, TH, THead, TR, EmptyState } from '@/components/ui/Table';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ClientStatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function AdminClients() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['admin-clients', search, status],
    queryFn: () => ClientsApi.list(search || undefined, status || undefined),
  });

  const totalPages = Math.max(1, Math.ceil((clients?.length ?? 0) / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paginatedClients = clients?.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Gestão de Clientes"
        description="Lista de titulares e respectivos contratos"
        action={
          <Link to="/admin/clientes/novo">
            <Button>
              <Plus className="h-4 w-4" /> Registar Cliente
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Pesquisar por nome, código, documento ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          <option value="">Todos os estados</option>
          <option value="GRACE_PERIOD">Em Carência</option>
          <option value="ACTIVE">Activo</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="TERMINATED">Rescindido</option>
        </Select>
      </div>

      <Table
        footer={
          !isLoading &&
          !!clients?.length && (
            <Pagination page={pageClamped} totalPages={totalPages} totalItems={clients.length} pageSize={PAGE_SIZE} onChange={setPage} />
          )
        }
      >
        <THead>
          <TR>
            <TH>Código</TH>
            <TH>Nome</TH>
            <TH>Telefone</TH>
            <TH>Plano</TH>
            <TH>Estado</TH>
            <TH>Registado em</TH>
          </TR>
        </THead>
        <TBody>
          {isLoading ? (
            <TR>
              <TD colSpan={6} className="text-center text-slate-400">
                A carregar...
              </TD>
            </TR>
          ) : (
            paginatedClients?.map((c) => (
              <TR key={c.id} className="cursor-pointer">
                <TD>
                  <Link to={`/admin/clientes/${c.id}`} className="font-medium text-emerald-800 hover:underline">
                    {c.clientCode}
                  </Link>
                </TD>
                <TD>{c.fullName}</TD>
                <TD>{c.phone}</TD>
                <TD>{c.contracts?.[0]?.plan?.displayName ?? '-'}</TD>
                <TD>
                  <ClientStatusBadge status={c.status} />
                </TD>
                <TD>{formatDate(c.createdAt)}</TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {!isLoading && clients?.length === 0 && <EmptyState message="Nenhum cliente encontrado." />}
    </div>
  );
}
