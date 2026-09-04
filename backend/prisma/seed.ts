import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'PREMIUM',
    displayName: 'Premium',
    description: 'Plano de entrada com urna modelo 1.',
    urnDescription: 'Urna (modelo 1)',
    coverageMin: 7000,
    coverageMax: null,
    monthlyFee: 50.5,
    quarterlyFee: 151.5,
    semiannualFee: 303.0,
    annualFee: 606.0,
    sortOrder: 1,
  },
  {
    name: 'LITE',
    displayName: 'Lite',
    description: 'Plano intermédio com urna especial nº 2.',
    urnDescription: 'Urna Especial Nº 2',
    coverageMin: 8500,
    coverageMax: null,
    monthlyFee: 55.5,
    quarterlyFee: 166.5,
    semiannualFee: 333.0,
    annualFee: 666.0,
    sortOrder: 2,
  },
  {
    name: 'LITE_PLUS',
    displayName: 'Lite Plus / Família',
    description: 'Plano familiar com urna especial nº 3B/3C.',
    urnDescription: 'Urna Especial Nº 3B, 3C',
    coverageMin: 10000,
    coverageMax: null,
    monthlyFee: 75.0,
    quarterlyFee: 225.0,
    semiannualFee: 450.0,
    annualFee: 900.0,
    sortOrder: 3,
  },
  {
    name: 'GOLD',
    displayName: 'Gold',
    description: 'Plano superior com urna especial nº 3A a 3T e cesta básica.',
    urnDescription: 'Urna Especial Nº 3A a 3T + Cesta Básica',
    coverageMin: 12000,
    coverageMax: 30000,
    monthlyFee: 100.0,
    quarterlyFee: 300.0,
    semiannualFee: 600.0,
    annualFee: 1200.0,
    sortOrder: 4,
  },
  {
    name: 'GOLD_PLUS',
    displayName: 'Gold Plus',
    description: 'Plano premium com urna especial 3T a Casket e cesta básica.',
    urnDescription: 'Urna Especial 3T a Casket + Cesta Básica',
    coverageMin: 32000,
    coverageMax: 65000,
    monthlyFee: 120.0,
    quarterlyFee: 360.0,
    semiannualFee: 720.0,
    annualFee: 1440.0,
    sortOrder: 5,
  },
];

async function main() {
  console.log('A semear planos de assistência funerária...');
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  const adminIdentifier = process.env.ADMIN_IDENTIFIER || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Hélder';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'Guivalar';

  const existingAdmin = await prisma.user.findUnique({ where: { identifier: adminIdentifier } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        identifier: adminIdentifier,
        firstName: adminFirstName,
        lastName: adminLastName,
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });
    console.log(`Utilizador administrador criado: ${adminIdentifier} / ${adminPassword} (terá de alterar a password no primeiro acesso)`);
  } else {
    console.log('Utilizador administrador já existe, a saltar.');
  }

  // Conta de demonstração — nunca semeada em produção, para não deixar um acesso fixo e
  // conhecido com todas as permissões num ambiente real.
  if (process.env.NODE_ENV !== 'production') {
    const existingAgent = await prisma.user.findUnique({ where: { identifier: 'agente1' } });
    if (!existingAgent) {
      const passwordHash = await bcrypt.hash('Agente@2026', 10);
      await prisma.user.create({
        data: {
          identifier: 'agente1',
          firstName: 'Agente',
          lastName: 'Demonstração',
          passwordHash,
          role: 'AGENT',
          mustChangePassword: true,
          permissions: ['VIEW_DASHBOARD', 'MANAGE_CLIENTS', 'MANAGE_DELINQUENCY', 'MANAGE_PAYMENTS'],
        },
      });
      console.log('Utilizador agente de demonstração criado: agente1 / Agente@2026 (apenas fora de produção)');
    }
  }

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
