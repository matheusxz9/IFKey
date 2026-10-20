import {
  IsString,
  IsOptional,
  MaxLength,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PerfilAdministrador,
  PERFIS_ADMINISTRADOR,
} from '../../common/enums/perfil-administrador.enum';

export class AtualizarAdministradorDto {
  @ApiPropertyOptional({ example: 'João Silva Santos' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @ApiPropertyOptional({
    enum: [PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR],
    example: PerfilAdministrador.GESTOR,
  })
  @IsOptional()
  @IsIn(PERFIS_ADMINISTRADOR, {
    message: 'perfil deve ser ADMINISTRADOR ou GESTOR',
  })
  perfil?: PerfilAdministrador;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
