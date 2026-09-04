import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class ManualPaymentDto {
  @IsString()
  contractId: string;

  @IsOptional()
  @IsString()
  installmentId?: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
