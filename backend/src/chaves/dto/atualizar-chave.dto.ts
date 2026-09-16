import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean } from 'class-validator';
import { CriarChaveDto } from './criar-chave.dto';

export class AtualizarChaveDto extends PartialType(CriarChaveDto) {
  @IsBoolean()
  ativo?: boolean;
}
