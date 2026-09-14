import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CriarEmprestimoDto {
  @IsInt()
  @IsPositive()
  solicitanteId: number;

  @IsInt()
  @IsPositive()
  chaveId: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
