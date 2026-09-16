import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChavesService } from './chaves.service';
import { CriarChaveDto } from './dto/criar-chave.dto';
import { AtualizarChaveDto } from './dto/atualizar-chave.dto';
import { ListarChavesQueryDto } from './dto/listar-chaves.query.dto';

@ApiTags('chaves')
@Controller('chaves')
export class ChavesController {
  constructor(private readonly chavesService: ChavesService) {}

  @Get()
  listar(@Query() query: ListarChavesQueryDto) {
    return this.chavesService.listar(query);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.chavesService.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarChaveDto) {
    return this.chavesService.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarChaveDto,
  ) {
    return this.chavesService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  inativar(@Param('id', ParseIntPipe) id: number) {
    return this.chavesService.inativar(id);
  }
}
