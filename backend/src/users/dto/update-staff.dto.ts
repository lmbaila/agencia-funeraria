import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Permission } from '@prisma/client';

/** Usado para editar tanto agentes como administradores. `permissions` só tem efeito para
 * agentes — um administrador tem sempre acesso total, independentemente do que aqui vier. */
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O apelido deve ter pelo menos 2 caracteres.' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O identificador deve ter pelo menos 3 caracteres.' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'O identificador só pode conter letras, números, pontos, hífenes e underscores.',
  })
  identifier?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
