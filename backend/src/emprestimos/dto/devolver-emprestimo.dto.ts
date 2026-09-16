import { IsOptional, IsString } from 'class-validator';

export class DevolverEmprestimoDto {
  @IsOptional()
  @IsString()
  observacoes?: string;
}
