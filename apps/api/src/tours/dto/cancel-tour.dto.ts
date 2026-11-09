import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelTourDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
