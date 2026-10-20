import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PerfilAdministrador,
  PERFIS_ADMINISTRADOR,
} from '../../common/enums/perfil-administrador.enum';

export class CriarAdministradorDto {
  @ApiProperty({ example: 'joao.silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  login: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @ApiProperty({
    enum: [PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR],
    example: PerfilAdministrador.GESTOR,
  })
  @IsIn(PERFIS_ADMINISTRADOR, {
    message: 'perfil deve ser ADMINISTRADOR ou GESTOR',
  })
  perfil: PerfilAdministrador;
}
