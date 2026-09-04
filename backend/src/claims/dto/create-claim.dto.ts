import { IsDateString, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ClaimBeneficiaryType } from '@prisma/client';

export class CreateClaimDto {
  @IsEnum(ClaimBeneficiaryType)
  beneficiaryType: ClaimBeneficiaryType;

  /** Obrigatório quando beneficiaryType = DEPENDENT — validado no serviço. */
  @IsOptional()
  @IsString()
  dependentId?: string;

  @IsDateString()
  dateOfDeath: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @Matches(/^documents\/[a-f0-9-]+\.(jpg|jpeg|png|webp|pdf)$/i, { message: 'Caminho de documento inválido.' })
  deathCertificatePath?: string;

  @IsOptional()
  @IsString()
  deathCertificateMimeType?: string;
}
