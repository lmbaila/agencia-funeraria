import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  /** Percentagem de juros de mora ao mês, ex: 2 para 2%. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeeMonthlyRatePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  suspensionThresholdInstallments?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  suspensionRegularizationDays?: number;

  /** Meses de carência após o pagamento da taxa de adesão. 0 = sem período de carência. */
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMonths?: number;

  /** Meses após o óbito do titular durante os quais ainda se pode comunicar o óbito de um dependente. */
  @IsOptional()
  @IsInt()
  @Min(0)
  postDeathClaimWindowMonths?: number;
}
