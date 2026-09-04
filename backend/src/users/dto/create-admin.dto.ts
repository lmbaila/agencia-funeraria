import { IsString, Matches, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'O apelido deve ter pelo menos 2 caracteres.' })
  lastName: string;

  @IsString()
  @MinLength(3, { message: 'O identificador deve ter pelo menos 3 caracteres.' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'O identificador só pode conter letras, números, pontos, hífenes e underscores.',
  })
  identifier: string;
}
