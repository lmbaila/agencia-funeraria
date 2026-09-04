import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ClaimBeneficiaryType } from '@prisma/client';

class ClaimSelectionDto {
  @IsEnum(ClaimBeneficiaryType)
  beneficiaryType: ClaimBeneficiaryType;

  @IsOptional()
  @IsString()
  dependentId?: string;
}

export class PublicClaimRequestDto {
  @IsString()
  @MinLength(4)
  documentNumber: string;

  @IsString()
  @Length(4, 4, { message: 'Indique os últimos 4 dígitos do telemóvel do titular.' })
  phoneLast4: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Seleccione pelo menos uma pessoa para comunicar o falecimento.' })
  @ValidateNested({ each: true })
  @Type(() => ClaimSelectionDto)
  selections: ClaimSelectionDto[];

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

  @IsString()
  @MinLength(2, { message: 'Indique o seu nome.' })
  requesterName: string;

  @IsString()
  @MinLength(9, { message: 'Indique um número de telemóvel válido para o podermos contactar.' })
  requesterPhone: string;

  @IsString()
  @MinLength(2, { message: 'Indique a sua relação com a pessoa falecida.' })
  requesterRelationship: string;
}
