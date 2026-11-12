import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { transformarTrim } from '../../common/dto/transformacoes';

export class DevolverEmprestimoDto {
  @IsOptional()
  @Transform(transformarTrim)
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
