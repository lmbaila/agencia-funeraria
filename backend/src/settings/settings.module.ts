import { Module, forwardRef } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ContractsModule } from '../contracts/contracts.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [forwardRef(() => ContractsModule), forwardRef(() => SchedulerModule)],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
