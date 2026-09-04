import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'O identificador é obrigatório' })
  identifier: string;

  @IsString()
  @IsNotEmpty({ message: 'A password é obrigatória' })
  password: string;
}
