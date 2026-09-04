import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'A nova password deve ter pelo menos 6 caracteres' })
  newPassword: string;
}
