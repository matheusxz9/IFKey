import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CriarChaveDto } from './criar-chave.dto';

export class AtualizarChaveDto extends PartialType(CriarChaveDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
