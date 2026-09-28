import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PerfilAdministrador } from '../../common/enums/perfil-administrador.enum';

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
    enum: PerfilAdministrador,
    example: PerfilAdministrador.GESTOR,
  })
  @IsEnum(PerfilAdministrador)
  perfil: PerfilAdministrador;
}
