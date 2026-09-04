import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    // Endpoint público (sem autenticação) — limite próprio para não ficar aberto a abuso ilimitado.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 8 }]),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
