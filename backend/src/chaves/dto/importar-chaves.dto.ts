import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LinhaImportacaoChaveDto {
  @IsInt()
  @IsPositive()
  linha: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  descricao?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  localizacao?: string;
}

export class ImportarChavesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => LinhaImportacaoChaveDto)
  linhas: LinhaImportacaoChaveDto[];
}
