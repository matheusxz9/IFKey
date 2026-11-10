import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';
import { transformarTrim } from '../../common/dto/transformacoes';

export class CriarSolicitanteDto {
  @Transform(transformarTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsEnum(TipoSolicitante)
  tipo: TipoSolicitante;

  @Transform(transformarTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  matricula: string;

  @Transform(transformarTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contato: string;
}
