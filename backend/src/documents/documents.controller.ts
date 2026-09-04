import { Controller, ForbiddenException, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('documents')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private prisma: PrismaService,
  ) {}

  private async assertAccess(contractId: string, user: AuthUser) {
    if (user.role === Role.ADMIN || user.role === Role.AGENT) return;
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.clientId !== user.clientId) {
      throw new ForbiddenException('Sem acesso a este contrato');
    }
  }

  @Get('contract/:contractId')
  async contractPdf(@Param('contractId') contractId: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    await this.assertAccess(contractId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${contractId}.pdf"`);
    const doc = await this.documentsService.generateContractPdf(contractId);
    doc.pipe(res);
  }

  @Get('extension/:addendumId')
  async extensionAddendumPdf(@Param('addendumId') addendumId: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const addendum = await this.prisma.addendum.findUnique({ where: { id: addendumId } });
    if (!addendum) throw new ForbiddenException('Aditivo não encontrado');
    await this.assertAccess(addendum.contractId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="aditivo-${addendumId}.pdf"`);
    const doc = await this.documentsService.generateExtensionAddendumPdf(addendumId);
    doc.pipe(res);
  }

  @Get('adhesion/:contractId')
  async adhesionPdf(@Param('contractId') contractId: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    await this.assertAccess(contractId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ficha-adesao-${contractId}.pdf"`);
    const doc = await this.documentsService.generateAdhesionPdf(contractId);
    doc.pipe(res);
  }

  @Get('claim/:claimId')
  async claimPdf(@Param('claimId') claimId: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new ForbiddenException('Sinistro não encontrado');
    await this.assertAccess(claim.contractId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="termo-sinistro-${claimId}.pdf"`);
    const doc = await this.documentsService.generateClaimPdf(claimId);
    doc.pipe(res);
  }

  @Get('receipt/:paymentId')
  async receiptPdf(@Param('paymentId') paymentId: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new ForbiddenException('Pagamento não encontrado');
    await this.assertAccess(payment.contractId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo-${paymentId}.pdf"`);
    const doc = await this.documentsService.generateReceiptPdf(paymentId);
    doc.pipe(res);
  }
}
