import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PaymentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { MobileMoneyService } from './gateways/mobile-money.service';
import { InitiateMobileMoneyDto } from './dto/initiate-mobile-money.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { generatePaymentReference } from '../common/utils/codes.util';
import { monthReferenceOf } from '../common/utils/date.util';

type Tx = Prisma.TransactionClient;

// Um pagamento PENDING mais antigo do que isto é considerado abandonado (ex: o servidor
// reiniciou a meio da simulação do gateway) e deixa de bloquear novas tentativas.
const STALE_PENDING_MINUTES = 5;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
    private mobileMoney: MobileMoneyService,
  ) {}

  /**
   * Determina o que está pendente de pagamento (primeiro a taxa de adesão, depois a mensalidade
   * mais antiga em aberto) e, quando chamado dentro de uma transacção, bloqueia a linha em causa
   * (SELECT ... FOR UPDATE) e rejeita se já existir um pagamento em curso ou concluído para o
   * mesmo alvo — evita que dois pedidos simultâneos cobrem a mesma coisa duas vezes.
   */
  async resolvePaymentTarget(contractId: string, installmentId: string | undefined, tx: Tx | PrismaService = this.prisma) {
    const contract = await tx.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    if (contract.status === 'TERMINATED' || contract.status === 'FULFILLED') {
      throw new BadRequestException(
        contract.status === 'TERMINATED'
          ? 'Este contrato está rescindido, não é possível cobrar valores.'
          : 'Este contrato já foi concluído por sinistro, não é possível cobrar valores.',
      );
    }

    if (!contract.membershipFeePaid) {
      if (tx !== this.prisma) {
        await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${contractId} FOR UPDATE`;
        await this.assertNoConflictingPayment(tx, {
          contractId,
          type: 'MEMBERSHIP_FEE',
          label: 'a taxa de adesão',
        });
      }
      return { type: PaymentType.MEMBERSHIP_FEE, amount: contract.membershipFeeAmount, installment: null, contract };
    }

    const currentMonthRef = monthReferenceOf(new Date());

    const installment = installmentId
      ? await tx.installment.findFirst({ where: { id: installmentId, contractId } })
      : await tx.installment.findFirst({
          where: { contractId, status: { in: ['PENDING', 'LATE'] }, monthReference: { lte: currentMonthRef } },
          orderBy: { sequence: 'asc' },
        });

    if (!installment) throw new BadRequestException('Não existem mensalidades pendentes para este contrato');

    if (installment.status !== 'PENDING' && installment.status !== 'LATE') {
      throw new BadRequestException('Esta mensalidade já não está em aberto');
    }

    if (installment.monthReference > currentMonthRef) {
      throw new BadRequestException(
        `Não é possível cobrar mensalidades de meses futuros. Esta mensalidade só vence em ${installment.monthReference}.`,
      );
    }

    if (tx !== this.prisma) {
      await tx.$queryRaw`SELECT id FROM installments WHERE id = ${installment.id} FOR UPDATE`;
      await this.assertNoConflictingPayment(tx, {
        contractId,
        type: 'INSTALLMENT',
        monthReference: installment.monthReference,
        label: `a mensalidade de ${installment.monthReference}`,
      });
    }

    const totalAmount = Number(installment.amount) + Number(installment.lateFee ?? 0);
    return { type: PaymentType.INSTALLMENT, amount: totalAmount, installment, contract };
  }

  private async assertNoConflictingPayment(
    tx: Tx,
    where: { contractId: string; type: PaymentType; monthReference?: string; label: string },
  ) {
    const existing = await tx.payment.findFirst({
      where: {
        contractId: where.contractId,
        type: where.type,
        monthReference: where.monthReference,
        status: { in: ['PENDING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!existing) return;
    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(`Já existe um pagamento concluído para ${where.label}.`);
    }
    const ageMinutes = (Date.now() - existing.createdAt.getTime()) / 60000;
    if (ageMinutes < STALE_PENDING_MINUTES) {
      throw new BadRequestException(`Já existe um pagamento em curso para ${where.label}. Aguarde a conclusão antes de tentar novamente.`);
    }
    // Pagamento PENDING antigo e provavelmente abandonado — liberta-o para não bloquear para sempre.
    await tx.payment.update({ where: { id: existing.id }, data: { status: 'FAILED', notes: 'Expirado automaticamente (sem resposta do gateway).' } });
  }

  async initiateMobileMoney(dto: InitiateMobileMoneyDto) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const target = await this.resolvePaymentTarget(dto.contractId, dto.installmentId, tx);

      const created = await tx.payment.create({
        data: {
          contractId: dto.contractId,
          type: target.type,
          amount: target.amount,
          method: dto.method,
          status: 'PENDING',
          reference: generatePaymentReference(dto.method),
          phoneUsed: dto.phone,
          monthReference: target.installment?.monthReference,
        },
      });

      if (target.installment) {
        await tx.installment.update({
          where: { id: target.installment.id },
          data: { paymentId: created.id },
        });
      }

      return { payment: created, amount: Number(target.amount) };
    });

    // Simula o pedido USSD ao gateway de forma assíncrona, já fora da transacção — o frontend faz polling ao estado.
    this.processMobileMoneyAsync(payment.payment.id, dto.method, dto.phone, payment.amount).catch((err) =>
      this.logger.error(`Falha ao processar pagamento móvel ${payment.payment.id}`, err),
    );

    return {
      paymentId: payment.payment.id,
      status: payment.payment.status,
      message: 'Prompt USSD enviado para o telemóvel. Confirme com o seu PIN.',
    };
  }

  private async processMobileMoneyAsync(paymentId: string, method: any, phone: string, amount: number) {
    const result = await this.mobileMoney.requestPayment({ method, phone, amount });

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        paidAt: result.success ? new Date() : undefined,
        notes: result.message,
      },
    });

    if (result.success) {
      await this.applySuccessfulPayment(payment.id, payment.contractId, payment.type);
    } else {
      // liberta a mensalidade para nova tentativa
      await this.prisma.installment.updateMany({ where: { paymentId: payment.id }, data: { paymentId: null } });
    }
  }

  async registerManualPayment(dto: ManualPaymentDto, registeredBy: string) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const target = await this.resolvePaymentTarget(dto.contractId, dto.installmentId, tx);
      const dueAmount = Number(target.amount);

      // O valor pode ser ajustado para cima (ex: arredondamento em numerário), mas nunca
      // registado como pago abaixo do que é devido — isso deixaria a cobrança marcada como
      // regularizada sem o ter sido de facto.
      if (dto.amount !== undefined && dto.amount < dueAmount) {
        throw new BadRequestException(
          `O valor introduzido (${dto.amount.toFixed(2)} MT) é inferior ao valor devido (${dueAmount.toFixed(2)} MT). Não é possível dar baixa parcial: regularize o valor completo ou ajuste a mensalidade separadamente.`,
        );
      }
      const amount = dto.amount ?? dueAmount;

      const created = await tx.payment.create({
        data: {
          contractId: dto.contractId,
          type: target.type,
          amount,
          method: dto.method,
          status: 'COMPLETED',
          reference: generatePaymentReference(dto.method),
          monthReference: target.installment?.monthReference,
          registeredById: registeredBy,
          notes: dto.notes,
          paidAt: new Date(),
        },
      });

      if (target.installment) {
        await tx.installment.update({
          where: { id: target.installment.id },
          data: { paymentId: created.id },
        });
      }

      return created;
    });

    await this.applySuccessfulPayment(payment.id, payment.contractId, payment.type);

    return payment;
  }

  private async applySuccessfulPayment(paymentId: string, contractId: string, type: PaymentType) {
    if (type === PaymentType.MEMBERSHIP_FEE) {
      await this.contractsService.payMembershipFee(contractId);
      return;
    }

    const installment = await this.prisma.installment.findUnique({ where: { paymentId } });
    if (installment) {
      await this.prisma.installment.update({
        where: { id: installment.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }
    await this.contractsService.reconcileAfterPayment(contractId);
  }

  async getStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    return payment;
  }

  async listForContract(contractId: string) {
    return this.prisma.payment.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(filters: { month?: string; status?: string }) {
    return this.prisma.payment.findMany({
      where: {
        monthReference: filters.month,
        status: filters.status ? (filters.status as any) : undefined,
      },
      include: { contract: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
