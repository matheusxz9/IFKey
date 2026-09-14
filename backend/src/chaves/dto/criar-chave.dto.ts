import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarChaveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsString()
  @IsNotEmpty()
  localizacao: string;
}
