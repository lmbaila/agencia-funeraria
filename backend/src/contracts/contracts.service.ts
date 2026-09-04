import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildContractNumber } from '../common/utils/codes.util';
import { addDays, addMonths, frequencyToMonths, monthReferenceOf } from '../common/utils/date.util';
import { PaymentFrequency, Prisma } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Cria um contrato para um cliente já existente, incluindo o plano de mensalidades
   * (installments) para toda a duração contratada, respeitando a frequência escolhida.
   * A taxa de adesão corresponde a 10% do valor de referência do plano (mensalidade x 12,
   * aproximação ao "valor do plano" mencionado no contrato modelo).
   */
  async createContract(
    tx: Prisma.TransactionClient | PrismaService,
    params: {
      clientId: string;
      planId: string;
      paymentFrequency: PaymentFrequency;
      durationMonths: number;
    },
  ) {
    const plan = await tx.plan.findUnique({ where: { id: params.planId } });
    if (!plan || !plan.active) throw new NotFoundException('Plano não encontrado ou inactivo');

    // A prestação cobre o titular e cada dependente activo (mesmo valor por pessoa).
    const perPersonFee = this.plansService.feeForFrequency(plan, params.paymentFrequency);
    const activeDependents = await tx.dependent.count({ where: { clientId: params.clientId, active: true } });
    const installmentAmount = new Prisma.Decimal(perPersonFee).mul(1 + activeDependents);
    // Taxa de adesão = 10% da cobertura mínima do plano (valor de referência do plano)
    const membershipFeeAmount = new Prisma.Decimal(plan.coverageMin).mul(0.1);

    const sequence = (await tx.contract.count()) + 1;
    const now = new Date();
    const contractNumber = buildContractNumber(now, sequence);

    const contract = await tx.contract.create({
      data: {
        contractNumber,
        clientId: params.clientId,
        planId: params.planId,
        paymentFrequency: params.paymentFrequency,
        installmentAmount,
        durationMonths: params.durationMonths,
        startDate: now,
        membershipFeeAmount,
        status: 'ACTIVE',
      },
    });

    await this.generateInstallments(tx, contract.id, now, params.paymentFrequency, params.durationMonths, installmentAmount);

    return contract;
  }

  private async generateInstallments(
    tx: Prisma.TransactionClient | PrismaService,
    contractId: string,
    startDate: Date,
    frequency: PaymentFrequency,
    durationMonths: number,
    amount: Prisma.Decimal | number,
  ) {
    const stepMonths = frequencyToMonths(frequency);
    const count = Math.max(1, Math.round(durationMonths / stepMonths));
    const firstDueDate = addDays(startDate, 30); // início 30 dias após a assinatura + taxa de adesão

    const rows: Prisma.InstallmentCreateManyInput[] = [];
    for (let i = 0; i < count; i++) {
      const dueDate = addMonths(firstDueDate, i * stepMonths);
      rows.push({
        contractId,
        sequence: i + 1,
        dueDate,
        monthReference: monthReferenceOf(dueDate),
        amount,
      });
    }
    await tx.installment.createMany({ data: rows });
  }

  /**
   * Recalcula a prestação (titular + cada dependente activo, ao valor por pessoa do plano) e
   * aplica o novo valor às mensalidades ainda por pagar — as já pagas ou perdoadas mantêm o
   * valor histórico. Chamado sempre que o número de dependentes activos do cliente muda
   * (inclusão, exclusão ou óbito de um dependente).
   */
  async recalculateInstallmentAmount(contractId: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const contract = await tx.contract.findUnique({ where: { id: contractId }, include: { plan: true } });
    if (!contract) return;
    if (contract.status === 'TERMINATED' || contract.status === 'FULFILLED') return;

    const activeDependents = await tx.dependent.count({ where: { clientId: contract.clientId, active: true } });
    const perPersonFee = this.plansService.feeForFrequency(contract.plan, contract.paymentFrequency);
    const newAmount = new Prisma.Decimal(perPersonFee).mul(1 + activeDependents);

    await tx.contract.update({ where: { id: contractId }, data: { installmentAmount: newAmount } });
    await tx.installment.updateMany({
      where: { contractId, status: { in: ['PENDING', 'LATE'] } },
      data: { amount: newAmount },
    });

    return newAmount;
  }

  async findAll(filters: { status?: string; search?: string }) {
    return this.prisma.contract.findMany({
      where: {
        status: filters.status ? (filters.status as any) : undefined,
        client: filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search, mode: 'insensitive' } },
                { clientCode: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : undefined,
      },
      include: { client: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        client: { include: { dependents: { where: { active: true } } } },
        plan: true,
        installments: { orderBy: { sequence: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        addendums: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async payMembershipFee(contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (contract.status === 'TERMINATED' || contract.status === 'FULFILLED') {
      throw new BadRequestException(
        contract.status === 'TERMINATED'
          ? 'Este contrato está rescindido, não é possível cobrar valores.'
          : 'Este contrato já foi concluído por sinistro, não é possível cobrar valores.',
      );
    }
    if (contract.membershipFeePaid) throw new BadRequestException('Taxa de adesão já foi paga');

    const settings = await this.settingsService.get();
    const paidAt = new Date();
    const gracePeriodEnd = addMonths(paidAt, settings.gracePeriodMonths);

    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id: contractId },
        data: { membershipFeePaid: true, membershipFeePaidAt: paidAt, gracePeriodEnd },
      }),
      this.prisma.client.update({
        where: { id: contract.clientId },
        data: { status: 'GRACE_PERIOD' },
      }),
    ]);

    return this.findOne(contractId);
  }

  async reapplyGracePeriodToExisting() {
    const settings = await this.settingsService.get();
    const contracts = await this.prisma.contract.findMany({
      where: {
        membershipFeePaid: true,
        membershipFeePaidAt: { not: null },
        client: { status: 'GRACE_PERIOD' },
      },
    });

    let updated = 0;
    for (const contract of contracts) {
      const gracePeriodEnd = addMonths(contract.membershipFeePaidAt!, settings.gracePeriodMonths);
      await this.prisma.contract.update({ where: { id: contract.id }, data: { gracePeriodEnd } });
      updated++;
    }

    return { updated };
  }

  async extendDuration(contractId: string, additionalMonths: number, createdBy?: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (contract.status === 'TERMINATED' || contract.status === 'FULFILLED') {
      throw new BadRequestException(
        contract.status === 'TERMINATED'
          ? 'Este contrato está rescindido, não é possível prorrogá-lo.'
          : 'Este contrato já foi concluído por sinistro, não é possível prorrogá-lo.',
      );
    }

    const newDuration = contract.durationMonths + additionalMonths;
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { durationMonths: newDuration },
    });

    const lastInstallment = await this.prisma.installment.findFirst({
      where: { contractId },
      orderBy: { sequence: 'desc' },
    });
    const stepMonths = frequencyToMonths(contract.paymentFrequency);
    const count = Math.round(additionalMonths / stepMonths);
    const baseDate = lastInstallment?.dueDate ?? new Date();
    const baseSeq = lastInstallment?.sequence ?? 0;

    const rows: Prisma.InstallmentCreateManyInput[] = [];
    for (let i = 1; i <= count; i++) {
      const dueDate = addMonths(baseDate, i * stepMonths);
      rows.push({
        contractId,
        sequence: baseSeq + i,
        dueDate,
        monthReference: monthReferenceOf(dueDate),
        amount: contract.installmentAmount,
      });
    }
    if (rows.length) await this.prisma.installment.createMany({ data: rows });

    const addendum = await this.prisma.addendum.create({
      data: {
        contractId,
        type: 'DURATION_EXTENSION',
        description: `Prorrogação do contrato em ${additionalMonths} meses (nova duração: ${newDuration} meses)`,
        createdBy,
        additionalMonths,
        newDurationMonths: newDuration,
      },
    });

    // Só a prorrogação, ao contrário de um pagamento ou cobrança, não deixava nenhum sinal
    // visível para o cliente — por isso avisamo-lo sempre que ela acontece.
    await this.notificationsService.sendContractExtensionNotice(contractId, additionalMonths, newDuration, createdBy);

    return { contract: await this.findOne(contractId), addendumId: addendum.id };
  }

  /**
   * Reverte uma suspensão ou rescisão (automática ou manual), devolvendo o contrato a ACTIVE.
   * Recusa-se a fazê-lo enquanto houver mensalidades em atraso por regularizar — caso contrário
   * o contrato voltaria a ACTIVE (desbloqueando sinistros e novos dependentes) sem a dívida que
   * motivou a suspensão ter sido paga. Regularizado o pagamento, o contrato reactiva-se sozinho
   * (ver `reconcileAfterPayment`); este método serve para os casos em que isso não chega a
   * acontecer automaticamente (ex: contrato já rescindido, ou suspensão indevida sem dívida real).
   * Uso reservado ao administrador.
   */
  async reactivateContract(contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (contract.status !== 'SUSPENDED' && contract.status !== 'TERMINATED' && contract.status !== 'FULFILLED') {
      throw new BadRequestException('Este contrato não está suspenso, rescindido nem concluído por sinistro.');
    }

    const now = new Date();
    const overdue = await this.prisma.installment.count({
      where: { contractId, status: { in: ['PENDING', 'LATE'] }, dueDate: { lt: now } },
    });
    if (overdue > 0) {
      throw new BadRequestException(
        `Este contrato ainda tem ${overdue} mensalidade(s) em atraso por regularizar. Registe o pagamento em falta antes de reactivar — o contrato reactiva-se automaticamente assim que a dívida for regularizada.`,
      );
    }

    const clientStatus = contract.gracePeriodEnd && contract.gracePeriodEnd > now ? 'GRACE_PERIOD' : 'ACTIVE';

    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
          suspensionDeadline: null,
          terminatedAt: null,
          terminationReason: null,
        },
      }),
      this.prisma.client.update({ where: { id: contract.clientId }, data: { status: clientStatus } }),
      this.prisma.addendum.create({
        data: {
          contractId,
          type: 'OTHER',
          description: 'Reactivação: contrato reactivado manualmente pelo administrador.',
        },
      }),
    ]);

    return this.findOne(contractId);
  }

  /** Rescisão manual do contrato, decidida pelo administrador/agente (motivo livre). */
  async terminateContract(contractId: string, reason: string, createdBy?: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (contract.status === 'TERMINATED') {
      throw new BadRequestException('Este contrato já está rescindido.');
    }
    if (contract.status === 'FULFILLED') {
      throw new BadRequestException('Este contrato já foi concluído por sinistro, não pode ser rescindido.');
    }

    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id: contractId },
        data: { status: 'TERMINATED', terminatedAt: new Date(), terminationReason: reason },
      }),
      this.prisma.client.update({ where: { id: contract.clientId }, data: { status: 'TERMINATED' } }),
      this.prisma.addendum.create({
        data: {
          contractId,
          type: 'OTHER',
          description: `Rescisão manual do contrato. Motivo: ${reason}`,
          createdBy,
        },
      }),
    ]);

    return this.findOne(contractId);
  }

  /** Reavalia o estado do contrato/cliente após um pagamento ser confirmado. */
  async reconcileAfterPayment(contractId: string) {
    const overdue = await this.prisma.installment.count({
      where: { contractId, status: { in: ['PENDING', 'LATE'] }, dueDate: { lt: new Date() } },
    });

    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return;

    if (overdue === 0 && contract.status === 'SUSPENDED') {
      await this.prisma.contract.update({
        where: { id: contractId },
        data: { status: 'ACTIVE', suspendedAt: null, suspensionDeadline: null },
      });
      const now = new Date();
      const clientStatus =
        contract.gracePeriodEnd && contract.gracePeriodEnd > now ? 'GRACE_PERIOD' : 'ACTIVE';
      await this.prisma.client.update({ where: { id: contract.clientId }, data: { status: clientStatus } });
    }
  }
}
