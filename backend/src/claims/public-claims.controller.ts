import { Controller, Get, Param, Post, Res, UseGuards, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { ClaimsService } from './claims.service';
import { PublicClaimLookupDto } from './dto/public-claim-lookup.dto';
import { PublicClaimRequestDto } from './dto/public-claim-request.dto';
import { DocumentsService } from '../documents/documents.service';

/**
 * Endpoints públicos (sem autenticação) usados pela página de comunicação de óbito, através
 * da qual o titular ou a sua família pode accionar o seguro sem precisar de iniciar sessão.
 * Protegidos por limite de pedidos por IP — envolvem confirmação de identidade por documento
 * + telemóvel + nome, pelo que precisam do seu próprio limite para não ficarem abertos a abuso.
 */
@ApiTags('public-claims')
@UseGuards(ThrottlerGuard)
@Controller('public/claims')
export class PublicClaimsController {
  constructor(
    private claimsService: ClaimsService,
    private documentsService: DocumentsService,
  ) {}

  @Post('lookup')
  lookup(@Body() dto: PublicClaimLookupDto) {
    return this.claimsService.lookupPublic(dto);
  }

  @Post('request')
  request(@Body() dto: PublicClaimRequestDto) {
    return this.claimsService.submitPublicRequest(dto);
  }

  @Get('comprovativo/:requestBatchId')
  async comprovativo(@Param('requestBatchId') requestBatchId: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprovativo-${requestBatchId}.pdf"`);
    const doc = await this.documentsService.generateClaimRequestReceiptPdf(requestBatchId);
    doc.pipe(res);
  }
}
