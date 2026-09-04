# Sistema de Gestão de Seguros Funerários — Agência Funerária Espírito Santo

Sistema completo (Backend NestJS + Frontend React) para gestão de planos de assistência funerária,
clientes, dependentes, contratos, mensalidades, pagamentos (M-Pesa/e-Mola simulados) e inadimplência,
desenvolvido para a **Agência Funerária Espírito Santo** (Matola, Moçambique — Proprietário: Hélder Guivalar).

## Arquitectura

```
├── backend/     NestJS + Prisma + PostgreSQL + JWT (API REST em /api)
├── frontend/    React + Vite + TypeScript + Tailwind CSS
└── docker-compose.yml
```

### Backend — módulos principais
- **auth** — login, JWT, RBAC (ADMIN, AGENT, CLIENT), troca de password
- **clients** — registo de titulares (público e presencial), gera identificador `AF-<ano>-<seq>` e password temporária
- **dependents** — gestão de beneficiários (gera aditivos automaticamente)
- **plans** — os 5 planos extraídos da Ficha de Adesão (Premium, Lite, Lite Plus, Gold, Gold Plus)
- **contracts** — geração de mensalidades, taxa de adesão (10%), carência (60 dias), prorrogação
- **payments** — pagamentos M-Pesa/e-Mola (simulados) e baixa manual pelo agente
- **portal** — endpoints self-service do cliente autenticado
- **dashboard** — KPIs e relatório de inadimplência mensal
- **documents** — geração de PDF do Contrato e da Ficha de Adesão
- **scheduler** — verificação diária de mora, suspensão (2 mensalidades em atraso) e rescisão automática (5 dias após suspensão)

### Frontend — três áreas
1. **Landing Page pública** (`/`) — apresentação, planos, adesão online (`/adesao`)
2. **Portal do Cliente** (`/portal`) — plano contratado, carência, dependentes, pagamentos
3. **Dashboard Administrativo** (`/admin`) — KPIs, clientes, inadimplência, pagamentos, impressão de contratos

## Como correr o projecto

### Opção 1 — Docker (recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:3000/api
- Documentação Swagger: http://localhost:3000/api/docs

O backend aplica as migrações e semeia os planos + utilizador administrador automaticamente no arranque.

### Opção 2 — Desenvolvimento local

**Backend:**
```bash
cd backend
cp .env.example .env      # ajuste DATABASE_URL se necessário
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Credenciais iniciais (seed)

| Perfil | Identificador | Password      |
|--------|----------------|---------------|
| Admin  | `admin`        | `Admin@2026`  |
| Agente | `agente1`      | `Agente@2026` |

Clientes são criados via adesão online ou registo presencial — o sistema gera automaticamente o
identificador (`AF-2026-0001`) e uma password temporária.

## Regras de negócio implementadas

- Taxa de adesão = 10% da cobertura do plano, paga no acto da adesão
- Carência de 60 dias a contar do pagamento da taxa de adesão
- Limite de 65 anos para adesão de titular/dependentes
- Duração de contrato: 12, 24 ou 48 meses
- Juros de mora de 2% ao mês sobre mensalidades em atraso
- Suspensão automática do contrato ao acumular 2 mensalidades em atraso
- Rescisão automática 5 dias após a suspensão sem regularização
- Inclusão/exclusão de dependentes gera aditivo automático ao contrato
