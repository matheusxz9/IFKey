import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PerfilAdministrador } from '../../common/enums/perfil-administrador.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListarAdministradoresQueryDto extends PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ example: 'João' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: 'joao.silva' })
  @IsOptional()
  @IsString()
  login?: string;

  @ApiPropertyOptional({ enum: PerfilAdministrador })
  @IsOptional()
  @IsEnum(PerfilAdministrador)
  perfil?: PerfilAdministrador;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  ativo?: boolean;
}
