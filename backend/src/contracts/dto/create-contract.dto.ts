import { IsEnum, IsIn, IsInt, IsString } from 'class-validator';
import { PaymentFrequency } from '@prisma/client';

export class CreateContractDto {
  @IsString()
  clientId: string;

  @IsString()
  planId: string;

  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @IsInt()
  @IsIn([12, 24, 48])
  durationMonths: number;
}
