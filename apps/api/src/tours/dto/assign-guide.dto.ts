import { IsUUID } from 'class-validator';

export class AssignGuideDto {
  @IsUUID()
  guideUserId!: string;
}
