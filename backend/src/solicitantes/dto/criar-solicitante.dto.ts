import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';

export class CriarSolicitanteDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEnum(TipoSolicitante)
  tipo: TipoSolicitante;

  @IsString()
  @IsNotEmpty()
  matricula: string;

  @IsString()
  @IsNotEmpty()
  contato: string;
}
