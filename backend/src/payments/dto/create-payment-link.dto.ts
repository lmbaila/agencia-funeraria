import { IsOptional, IsString } from 'class-validator';

export class CreatePaymentLinkDto {
  @IsString()
  contractId: string;

  @IsOptional()
  @IsString()
  installmentId?: string;
}
