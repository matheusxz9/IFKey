import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { transformarTrim } from '../../common/dto/transformacoes';

export class CriarChaveDto {
  @Transform(transformarTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo: string;

  @Transform(transformarTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  descricao: string;

  @Transform(transformarTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  localizacao: string;
}
