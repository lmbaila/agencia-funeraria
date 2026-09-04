import { IsEnum, Matches } from 'class-validator';
import { MobileMoneyMethod } from './initiate-mobile-money.dto';

export class PayViaLinkDto {
  @IsEnum(MobileMoneyMethod)
  method: MobileMoneyMethod;

  @Matches(/^8[2-7][0-9]{7}$/, {
    message: 'Número de telemóvel moçambicano inválido (ex: 84XXXXXXX)',
  })
  phone: string;
}
