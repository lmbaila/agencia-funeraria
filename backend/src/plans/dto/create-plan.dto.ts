import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  urnDescription?: string;

  @IsNumber()
  @Min(0)
  coverageMin: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coverageMax?: number;

  @IsNumber() @Min(0) monthlyFee: number;
  @IsNumber() @Min(0) quarterlyFee: number;
  @IsNumber() @Min(0) semiannualFee: number;
  @IsNumber() @Min(0) annualFee: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
