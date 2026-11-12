import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginSuapDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  code: string;
}
