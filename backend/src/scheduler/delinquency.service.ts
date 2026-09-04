import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from '../common/utils/date.util';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class DelinquencyService {
  private readonly logger = new Logger(DelinquencyService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCron() {
    await this.runCheck();
  }

  /**
   * Rotina diária (ou accionada manualmente pelo admin) que, com base nos parâmetros
   * configuráveis em SystemSettings:
   *  1. Marca mensalidades vencidas como LATE e recalcula juros de mora;
   *  2. Suspende contratos com prestações em atraso a partir do limiar configurado;
   *  3. Rescinde automaticamente contratos suspensos sem regularização dentro do prazo configurado;
   *  4. Activa clientes cujo período de carência (60 dias após o pagamento da taxa de adesão) terminou.
   */
  async runCheck() {
    const now = new Date();
    const settings = await this.settingsService.get();
    const lateFeeMonthlyRate = Number(settings.lateFeeMonthlyRate);
    const summary = { markedLate: 0, suspended: 0, terminated: 0, remindersSent: 0, activated: 0 };

    const overdueInstallments = await this.prisma.installment.findMany({
      where: { status: { in: ['PENDING', 'LATE'] }, dueDate: { lt: now } },
    });

    for (const installment of overdueInstallments) {
      const monthsLate = this.monthsBetween(installment.dueDate, now);
      const lateFee = Number(installment.amount) * lateFeeMonthlyRate * Math.max(monthsLate, 1);
      const wasPending = installment.status === 'PENDING';
      await this.prisma.installment.update({
        where: { id: installment.id },
        data: { status: 'LATE', lateFee },
      });
      summary.markedLate++;

      // Envia o lembrete de cobrança apenas no momento em que a mensalidade passa a atrasada
      // (transição PENDING → LATE), para não repetir o mesmo aviso todos os dias.
      if (wasPending) {
        await this.notificationsService.sendInstallmentReminder(installment.id);
        summary.remindersSent++;
      }
    }

    const activeContracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      include: { installments: true },
    });

    for (const contract of activeContracts) {
      const overdueCount = contract.installments.filter(
        (i) => i.status === 'LATE' && i.dueDate < now,
      ).length;

      if (overdueCount >= settings.suspensionThresholdInstallments) {
        const suspensionDeadline = addDays(now, settings.suspensionRegularizationDays);
        await this.prisma.$transaction([
          this.prisma.contract.update({
            where: { id: contract.id },
            data: { status: 'SUSPENDED', suspendedAt: now, suspensionDeadline },
          }),
          this.prisma.client.update({
            where: { id: contract.clientId },
            data: { status: 'SUSPENDED' },
          }),
        ]);
        summary.suspended++;
      }
    }

    const suspendedContracts = await this.prisma.contract.findMany({
      where: { status: 'SUSPENDED' },
      include: { installments: true },
    });

    for (const contract of suspendedContracts) {
      const stillOverdue = contract.installments.some((i) => i.status === 'LATE');
      if (stillOverdue && contract.suspensionDeadline && contract.suspensionDeadline < now) {
        await this.prisma.$transaction([
          this.prisma.contract.update({
            where: { id: contract.id },
            data: {
              status: 'TERMINATED',
              terminatedAt: now,
              terminationReason: `Rescisão automática por falta de regularização das prestações em atraso no prazo de ${settings.suspensionRegularizationDays} dias após a suspensão (Cláusula Décima Primeira).`,
            },
          }),
          this.prisma.client.update({
            where: { id: contract.clientId },
            data: { status: 'TERMINATED' },
          }),
        ]);
        summary.terminated++;
      }
    }

    // Contratos ACTIVE cujo período de carência já terminou e cujo cliente ainda está marcado
    // como GRACE_PERIOD (consultado de novo aqui, pelo que contratos suspensos/rescindidos
    // acima nesta mesma execução já ficam correctamente excluídos).
    const graceExpiredContracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE', gracePeriodEnd: { lte: now }, client: { status: 'GRACE_PERIOD' } },
    });

    for (const contract of graceExpiredContracts) {
      await this.prisma.$transaction([
        this.prisma.client.update({ where: { id: contract.clientId }, data: { status: 'ACTIVE' } }),
        this.prisma.addendum.create({
          data: {
            contractId: contract.id,
            type: 'OTHER',
            description: 'Fim do período de carência. Cliente e contrato considerados totalmente activos.',
          },
        }),
      ]);
      summary.activated++;
    }

    this.logger.log(
      `Verificação de inadimplência concluída: ${summary.markedLate} mensalidades marcadas em atraso, ${summary.remindersSent} lembretes enviados, ${summary.suspended} contratos suspensos, ${summary.terminated} contratos rescindidos, ${summary.activated} clientes activados após fim da carência.`,
    );
    return summary;
  }

  private monthsBetween(from: Date, to: Date): number {
    return (
      (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth()) +
      (to.getDate() >= from.getDate() ? 0 : -1) +
      1
    );
  }
}
