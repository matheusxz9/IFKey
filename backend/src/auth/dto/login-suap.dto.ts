import { IsNotEmpty, IsString } from 'class-validator';

export class LoginSuapDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
