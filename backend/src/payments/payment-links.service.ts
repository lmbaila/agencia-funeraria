import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PayViaLinkDto } from './dto/pay-via-link.dto';

const LINK_TTL_HOURS = 48;

@Injectable()
export class PaymentLinksService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private config: ConfigService,
  ) {}

  async create(dto: CreatePaymentLinkDto, createdById?: string) {
    // Valida que o contrato/mensalidade existem e têm algo pendente antes de gerar o link.
    await this.paymentsService.resolvePaymentTarget(dto.contractId, dto.installmentId);

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_TTL_HOURS * 60 * 60 * 1000);

    const link = await this.prisma.paymentLink.create({
      data: {
        token,
        contractId: dto.contractId,
        installmentId: dto.installmentId,
        createdById,
        expiresAt,
      },
    });

    const baseUrl = this.config.get<string>('CORS_ORIGIN', 'http://localhost:8080');
    return { token: link.token, url: `${baseUrl}/pagar/${link.token}`, expiresAt: link.expiresAt };
  }

  private async findValidLink(token: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { token },
      include: {
        contract: { include: { client: true, plan: true } },
        installment: true,
      },
    });
    if (!link) throw new NotFoundException('Link de pagamento não encontrado.');
    if (link.expiresAt < new Date()) throw new BadRequestException('Este link de pagamento expirou.');
    if (link.usedAt) throw new BadRequestException('Este link de pagamento já foi utilizado.');
    return link;
  }

  async getPublicInfo(token: string) {
    const link = await this.findValidLink(token);
    const target = await this.paymentsService.resolvePaymentTarget(link.contractId, link.installmentId ?? undefined);

    return {
      clientName: link.contract.client.fullName,
      clientPhone: link.contract.client.phone,
      contractNumber: link.contract.contractNumber,
      planName: link.contract.plan.displayName,
      type: target.type,
      amount: target.amount,
      monthReference: target.installment?.monthReference ?? null,
      expiresAt: link.expiresAt,
    };
  }

  async pay(token: string, dto: PayViaLinkDto) {
    const link = await this.findValidLink(token);
    const result = await this.paymentsService.initiateMobileMoney({
      contractId: link.contractId,
      installmentId: link.installmentId ?? undefined,
      method: dto.method,
      phone: dto.phone,
    });
    await this.prisma.paymentLink.update({ where: { token }, data: { paymentId: result.paymentId } });
    return result;
  }

  async status(token: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { token } });
    if (!link) throw new NotFoundException('Link de pagamento não encontrado.');
    if (!link.paymentId) {
      return { status: 'NOT_STARTED' as const };
    }

    const payment = await this.paymentsService.getStatus(link.paymentId);
    if (payment.status === 'COMPLETED' && !link.usedAt) {
      await this.prisma.paymentLink.update({ where: { token }, data: { usedAt: new Date() } });
    }
    return { status: payment.status, notes: payment.notes };
  }
}
