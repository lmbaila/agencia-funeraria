import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async kpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [totalClients, activeClients, suspendedContracts, terminatedContracts, monthlyRevenueAgg, delinquentCount, gracePeriodClients] =
      await Promise.all([
        this.prisma.client.count(),
        this.prisma.client.count({ where: { status: 'ACTIVE' } }),
        this.prisma.contract.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.contract.count({ where: { status: 'TERMINATED' } }),
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED', paidAt: { gte: monthStart, lt: monthEnd } },
          _sum: { amount: true },
        }),
        this.prisma.installment.count({
          where: { monthReference: monthRef, status: { in: ['PENDING', 'LATE'] } },
        }),
        this.prisma.client.count({ where: { status: 'GRACE_PERIOD' } }),
      ]);

    return {
      totalClients,
      activeClients,
      gracePeriodClients,
      suspendedContracts,
      terminatedContracts,
      monthlyRevenue: monthlyRevenueAgg._sum.amount ?? 0,
      delinquentThisMonth: delinquentCount,
      currentMonthReference: monthRef,
    };
  }

  async delinquencyReport(month: number, year: number) {
    const monthRef = `${year}-${String(month).padStart(2, '0')}`;

    const installments = await this.prisma.installment.findMany({
      where: {
        monthReference: monthRef,
        status: { in: ['PENDING', 'LATE'] },
      },
      include: {
        contract: {
          include: { client: true, plan: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return installments.map((i) => ({
      installmentId: i.id,
      contractId: i.contractId,
      contractNumber: i.contract.contractNumber,
      clientId: i.contract.clientId,
      clientCode: i.contract.client.clientCode,
      clientName: i.contract.client.fullName,
      clientPhone: i.contract.client.phone,
      planName: i.contract.plan.displayName,
      dueDate: i.dueDate,
      amount: i.amount,
      lateFee: i.lateFee,
      totalDue: Number(i.amount) + Number(i.lateFee),
      status: i.status,
      contractStatus: i.contract.status,
      clientStatus: i.contract.client.status,
    }));
  }

  async monthlyRevenueSeries(year: number) {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'COMPLETED', paidAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      select: { amount: true, paidAt: true },
    });
    const series = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));
    for (const p of payments) {
      const m = (p.paidAt as Date).getMonth();
      series[m].total += Number(p.amount);
    }
    return series;
  }
}
