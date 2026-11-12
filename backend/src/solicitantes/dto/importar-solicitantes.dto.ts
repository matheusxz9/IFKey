import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  IsPositive,
  IsArray,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LinhaImportacaoSolicitanteDto {
  @IsInt()
  @IsPositive()
  linha: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  tipo?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(30)
  matricula?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  contato?: string | null;
}

export class ImportarSolicitantesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => LinhaImportacaoSolicitanteDto)
  linhas: LinhaImportacaoSolicitanteDto[];
}
