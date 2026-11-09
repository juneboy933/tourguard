import { IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterGuestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(24)
  phone!: string;
}
