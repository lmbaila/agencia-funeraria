import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DocumentType } from '@prisma/client';
import { IsValidMzDocumentNumber } from '../../common/validators/mz-document.validator';

/** Campos opcionais chegam como string vazia quando não preenchidos no formulário. */
const EmptyToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

export class CreateDependentDto {
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'O apelido deve ter pelo menos 2 caracteres.' })
  lastName: string;

  @IsString()
  relationship: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @IsValidMzDocumentNumber()
  documentNumber?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
