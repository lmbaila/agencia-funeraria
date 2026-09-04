import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { PublicClaimsController } from './public-claims.controller';
import { ContractsModule } from '../contracts/contracts.module';
import { DocumentsModule } from '../documents/documents.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    ContractsModule,
    DocumentsModule,
    SettingsModule,
    // Endpoints públicos de comunicação de óbito — limite próprio para não ficarem abertos a abuso.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }]),
  ],
  providers: [ClaimsService],
  controllers: [ClaimsController, PublicClaimsController],
  exports: [ClaimsService],
})
export class ClaimsModule {}
