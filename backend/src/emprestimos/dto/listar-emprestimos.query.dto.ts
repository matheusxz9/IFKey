import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StatusEmprestimo } from '../../common/enums/status-emprestimo.enum';

export class ListarEmprestimosQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StatusEmprestimo)
  status?: StatusEmprestimo;

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
