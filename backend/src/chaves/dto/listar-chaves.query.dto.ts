import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StatusChave } from '../../common/enums/status-chave.enum';

export class ListarChavesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StatusChave)
  status?: StatusChave;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  busca?: string;
}
