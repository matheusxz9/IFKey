import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class HistoricoEmprestimosQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  de?: string;

  @IsOptional()
  @IsDateString()
  ate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  solicitanteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chaveId?: number;
}
