import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PerfilAdministrador } from '../../common/enums/perfil-administrador.enum';

export class AtualizarAdministradorDto {
  @ApiPropertyOptional({ example: 'João Silva Santos' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @ApiPropertyOptional({
    enum: PerfilAdministrador,
    example: PerfilAdministrador.GESTOR,
  })
  @IsOptional()
  @IsEnum(PerfilAdministrador)
  perfil?: PerfilAdministrador;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
