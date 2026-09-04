import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DelinquencyService } from './delinquency.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule, forwardRef(() => SettingsModule)],
  providers: [DelinquencyService],
  exports: [DelinquencyService],
})
export class SchedulerModule {}
