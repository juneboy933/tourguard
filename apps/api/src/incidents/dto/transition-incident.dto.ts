import { IsInt, IsOptional, Min } from 'class-validator';

export class TransitionIncidentDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedVersion?: number;
}

