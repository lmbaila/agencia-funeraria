import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';
import { PublicPaymentLinksController } from './public-payment-links.controller';
import { MobileMoneyService } from './gateways/mobile-money.service';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [ContractsModule],
  providers: [PaymentsService, MobileMoneyService, PaymentLinksService],
  controllers: [PaymentsController, PaymentLinksController, PublicPaymentLinksController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
