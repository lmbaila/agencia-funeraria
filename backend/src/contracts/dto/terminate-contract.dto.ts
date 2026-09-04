import { IsString, MinLength } from 'class-validator';

export class TerminateContractDto {
  @IsString()
  @MinLength(3, { message: 'Indique o motivo da rescisão.' })
  reason: string;
}
