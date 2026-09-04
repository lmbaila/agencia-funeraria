import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PublicRegistrationController } from './public-registration.controller';
import { ContractsModule } from '../contracts/contracts.module';
import { DependentsModule } from '../dependents/dependents.module';

@Module({
  imports: [ContractsModule, DependentsModule],
  providers: [ClientsService],
  controllers: [ClientsController, PublicRegistrationController],
  exports: [ClientsService],
})
export class ClientsModule {}
