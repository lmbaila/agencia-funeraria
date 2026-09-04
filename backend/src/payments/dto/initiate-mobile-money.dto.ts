import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export enum MobileMoneyMethod {
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
}

export class InitiateMobileMoneyDto {
  @IsString()
  contractId: string;

  @IsEnum(MobileMoneyMethod)
  method: MobileMoneyMethod;

  @Matches(/^8[2-7][0-9]{7}$/, {
    message: 'Número de telemóvel moçambicano inválido (ex: 84XXXXXXX)',
  })
  phone: string;

  @IsOptional()
  @IsString()
  installmentId?: string;
}
