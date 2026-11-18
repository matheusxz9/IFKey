import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDemoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  login: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  senha: string;
}
