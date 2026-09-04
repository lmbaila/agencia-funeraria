import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlansModule } from './plans/plans.module';
import { ClientsModule } from './clients/clients.module';
import { DependentsModule } from './dependents/dependents.module';
import { ContractsModule } from './contracts/contracts.module';
import { PaymentsModule } from './payments/payments.module';
import { PortalModule } from './portal/portal.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { AddressLookupModule } from './address-lookup/address-lookup.module';
import { ClaimsModule } from './claims/claims.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PlansModule,
    ClientsModule,
    DependentsModule,
    ContractsModule,
    PaymentsModule,
    PortalModule,
    DashboardModule,
    DocumentsModule,
    UploadsModule,
    UsersModule,
    SchedulerModule,
    AddressLookupModule,
    ClaimsModule,
    NotificationsModule,
    SettingsModule,
  ],
})
export class AppModule {}
