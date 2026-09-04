import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DocumentType, MaritalStatus, PaymentFrequency } from '@prisma/client';
import { CreateDependentDto } from '../../dependents/dto/create-dependent.dto';
import { IsValidMzDistrict, IsValidMzDocumentNumber } from '../../common/validators/mz-document.validator';
import { MZ_PHONE_MESSAGE, MZ_PHONE_REGEX, MZ_PROVINCES, NATIONALITIES } from '../../common/utils/mz-validators';

/** Campos opcionais chegam como string vazia quando não preenchidos no formulário. */
const EmptyToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

export class CreateClientDto {
  // Dados pessoais
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres.' })
  lastName: string;

  /** Identificador de acesso ao Portal do Cliente — gerado a partir do nome, mas o utilizador
   * pode editá-lo (ex: para resolver uma colisão com outro já registado). */
  @IsString()
  @MinLength(3, { message: 'O identificador deve ter pelo menos 3 caracteres.' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'O identificador só pode conter letras, números, pontos, hífenes e underscores.',
  })
  identifier: string;

  @IsString()
  @IsIn(NATIONALITIES as unknown as string[], { message: 'Seleccione uma nacionalidade válida.' })
  nationality: string;

  @IsString()
  placeOfBirth: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsString()
  @IsValidMzDocumentNumber()
  documentNumber: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsDateString()
  birthDate: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @Matches(/^documents\/[a-f0-9-]+\.(jpg|jpeg|png|webp|pdf)$/i, { message: 'Caminho de documento inválido.' })
  documentImagePath?: string;

  @IsOptional()
  @IsString()
  documentImageMimeType?: string;

  // Contacto e endereço
  @IsString()
  @Matches(MZ_PHONE_REGEX, { message: MZ_PHONE_MESSAGE })
  phone: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @Matches(MZ_PHONE_REGEX, { message: MZ_PHONE_MESSAGE })
  alternativePhone?: string;

  @IsString()
  @IsIn(MZ_PROVINCES as unknown as string[], { message: 'Seleccione uma província válida.' })
  province: string;

  @IsString()
  @IsValidMzDistrict()
  district: string;

  @IsString()
  neighborhood: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  addressLine?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  block?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  houseNumber?: string;

  // Plano
  @IsString()
  planId: string;

  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @IsInt()
  @IsIn([12, 24, 48])
  durationMonths: number;

  // Dependentes (opcional no acto de adesão)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDependentDto)
  dependents?: CreateDependentDto[];
}
