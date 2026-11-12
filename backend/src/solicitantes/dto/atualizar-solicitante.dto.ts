import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AtualizarSolicitanteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsEnum(TipoSolicitante)
  tipo?: TipoSolicitante;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  @MaxLength(30)
  matricula?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  contato?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
