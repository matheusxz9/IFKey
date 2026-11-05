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

export class RepassarEmprestimoDto {
  @IsInt()
  @IsPositive()
  solicitanteId: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
