import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoSolicitante } from '../../common/enums/tipo-solicitante.enum';

export class ConverterSolicitanteDto {
  @ApiProperty({ enum: TipoSolicitante, example: TipoSolicitante.ALUNO })
  @IsEnum(TipoSolicitante)
  tipo: TipoSolicitante;

  @ApiPropertyOptional({
    example: '20251038060031',
    description: 'Matrícula do SUAP. Se omitida, usa o login do administrador.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  matricula?: string;

  @ApiPropertyOptional({ example: 'usuario@escolar.ifrn.edu.br' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contato?: string;
}
