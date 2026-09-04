import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentLinksService } from './payment-links.service';
import { PayViaLinkDto } from './dto/pay-via-link.dto';

/**
 * Endpoints públicos (sem autenticação) usados pela página de pagamento por link,
 * partilhada pelo agente/admin com o cliente via SMS/WhatsApp.
 */
@ApiTags('public-payment-links')
@Controller('public/payment-links')
export class PublicPaymentLinksController {
  constructor(private paymentLinksService: PaymentLinksService) {}

  @Get(':token')
  getInfo(@Param('token') token: string) {
    return this.paymentLinksService.getPublicInfo(token);
  }

  @Post(':token/pay')
  pay(@Param('token') token: string, @Body() dto: PayViaLinkDto) {
    return this.paymentLinksService.pay(token, dto);
  }

  @Get(':token/status')
  status(@Param('token') token: string) {
    return this.paymentLinksService.status(token);
  }
}
