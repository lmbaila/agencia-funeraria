import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(value: any): string {
  return `${Number(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
}

/**
 * Envio de lembretes de cobrança por SMS/WhatsApp — actualmente simulado (sem gateway real
 * ligado, à semelhança do simulador de pagamento móvel). Em produção, `send()` seria
 * substituído pela integração com um provedor real (ex: Africa's Talking, Twilio).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  findAllForContract(contractId: string) {
    return this.prisma.notification.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendInstallmentReminder(installmentId: string, triggeredBy?: string) {
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: { contract: { include: { client: true, plan: true } } },
    });
    if (!installment) throw new NotFoundException('Mensalidade não encontrada');
    if (installment.status !== 'PENDING' && installment.status !== 'LATE') {
      throw new BadRequestException('Esta mensalidade já foi paga ou isentada, não há lembrete a enviar.');
    }

    const { contract } = installment;
    const { client, plan } = contract;
    const totalDue = Number(installment.amount) + Number(installment.lateFee ?? 0);

    const message =
      installment.status === 'LATE'
        ? `Prezado(a) ${client.fullName}, a mensalidade do plano ${plan.displayName} (contrato ${contract.contractNumber}) vencida em ${formatDate(installment.dueDate)} está em atraso. Valor a regularizar: ${formatMoney(totalDue)}. Agência Funerária Espírito Santo.`
        : `Prezado(a) ${client.fullName}, lembramos que a mensalidade do plano ${plan.displayName} (contrato ${contract.contractNumber}), no valor de ${formatMoney(totalDue)}, vence em ${formatDate(installment.dueDate)}. Agência Funerária Espírito Santo.`;

    const notification = await this.prisma.notification.create({
      data: {
        contractId: contract.id,
        installmentId: installment.id,
        channel: 'SMS',
        phone: client.phone,
        message,
        triggeredById: triggeredBy,
      },
    });

    this.logger.log(`SMS (simulado) enviado para ${client.phone}: ${message}`);
    return notification;
  }

  /** Avisa o cliente sempre que o contrato é prorrogado — a prorrogação em si não tem nenhum
   * outro traço visível para ele, ao contrário de um pagamento ou de uma cobrança. */
  async sendContractExtensionNotice(contractId: string, additionalMonths: number, newDurationMonths: number, triggeredBy?: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { client: true, plan: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    const { client, plan } = contract;
    const message = `Prezado(a) ${client.fullName}, o seu contrato ${contract.contractNumber} (plano ${plan.displayName}) foi prorrogado em ${additionalMonths} mes(es). Nova duração total: ${newDurationMonths} meses. Agência Funerária Espírito Santo.`;

    const notification = await this.prisma.notification.create({
      data: {
        contractId: contract.id,
        channel: 'SMS',
        phone: client.phone,
        message,
        triggeredById: triggeredBy,
      },
    });

    this.logger.log(`SMS (simulado) enviado para ${client.phone}: ${message}`);
    return notification;
  }
}
