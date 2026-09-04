import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [SchedulerModule, ContractsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
