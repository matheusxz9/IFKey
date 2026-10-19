import { PartialType } from '@nestjs/mapped-types';
import { CriarSolicitanteDto } from './criar-solicitante.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class AtualizarSolicitanteDto extends PartialType(CriarSolicitanteDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
