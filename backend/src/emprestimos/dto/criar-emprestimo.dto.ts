import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { transformarTrim } from '../../common/dto/transformacoes';

export class CriarEmprestimoDto {
  @IsInt()
  @IsPositive()
  solicitanteId: number;

  @IsInt()
  @IsPositive()
  chaveId: number;

  @IsOptional()
  @Transform(transformarTrim)
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
