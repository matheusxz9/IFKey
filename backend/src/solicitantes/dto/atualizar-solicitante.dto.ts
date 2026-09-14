import { PartialType } from '@nestjs/mapped-types';
import { CriarSolicitanteDto } from './criar-solicitante.dto';
import { IsBoolean } from 'class-validator';

export class AtualizarSolicitanteDto extends PartialType(CriarSolicitanteDto) {
  @IsBoolean()
  ativo?: boolean;
}
