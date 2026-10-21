import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CriarEmprestimoDto {
  @IsInt()
  @IsPositive()
  solicitanteId: number;

  @IsInt()
  @IsPositive()
  chaveId: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
