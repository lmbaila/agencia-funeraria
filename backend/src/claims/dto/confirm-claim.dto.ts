import { IsOptional, IsString, Matches } from 'class-validator';

export class ConfirmClaimDto {
  /** Permite ao agente anexar a certidão de óbito neste momento, se a família a trouxe em papel
   * e ainda não tinha sido anexada na comunicação online. */
  @IsOptional()
  @IsString()
  @Matches(/^documents\/[a-f0-9-]+\.(jpg|jpeg|png|webp|pdf)$/i, { message: 'Caminho de documento inválido.' })
  deathCertificatePath?: string;

  @IsOptional()
  @IsString()
  deathCertificateMimeType?: string;
}
