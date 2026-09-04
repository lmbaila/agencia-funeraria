import { IsString, MinLength } from 'class-validator';

export class RejectClaimDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
