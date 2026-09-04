import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { ClientsModule } from '../clients/clients.module';
import { DependentsModule } from '../dependents/dependents.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ClientsModule, DependentsModule, PaymentsModule],
  controllers: [PortalController],
})
export class PortalModule {}
