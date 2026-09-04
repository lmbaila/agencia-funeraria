import { Module } from '@nestjs/common';
import { DependentsService } from './dependents.service';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [ContractsModule],
  providers: [DependentsService],
  exports: [DependentsService],
})
export class DependentsModule {}
