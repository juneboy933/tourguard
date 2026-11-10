import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ResolveIncidentDto {
  @IsString()
  @MaxLength(500)
  notes!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  expectedVersion?: number;
}

