import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';

export class ListarSolicitantesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  matricula?: string;

  @IsOptional()
  @IsEnum(TipoSolicitante)
  tipo?: TipoSolicitante;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  ativo?: boolean;
}
