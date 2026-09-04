import { IsString, Length, MinLength } from 'class-validator';

export class PublicClaimLookupDto {
  @IsString()
  @MinLength(4)
  documentNumber: string;

  /** Últimos 4 dígitos do telemóvel do titular, usados como segundo factor de confirmação. */
  @IsString()
  @Length(4, 4, { message: 'Indique os últimos 4 dígitos do telemóvel do titular.' })
  phoneLast4: string;

  /** Nome do titular ou de um dos dependentes cobertos — o que a família tiver mais à mão. */
  @IsString()
  @MinLength(2)
  name: string;
}
