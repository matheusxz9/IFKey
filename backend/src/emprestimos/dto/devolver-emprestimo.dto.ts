import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DevolverEmprestimoDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
