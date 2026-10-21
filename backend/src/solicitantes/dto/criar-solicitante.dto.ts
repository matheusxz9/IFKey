import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CriarSolicitanteDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsEnum(TipoSolicitante)
  tipo: TipoSolicitante;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  matricula: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contato: string;
}
