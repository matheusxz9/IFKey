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
import { SolicitantesService } from './solicitantes.service';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';

@ApiTags('solicitantes')
@Controller('solicitantes')
export class SolicitantesController {
  constructor(private readonly solicitantesService: SolicitantesService) {}

  @Get()
  listar(@Query() query: ListarSolicitantesQueryDto) {
    return this.solicitantesService.listar(query);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.solicitantesService.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarSolicitanteDto) {
    return this.solicitantesService.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarSolicitanteDto,
  ) {
    return this.solicitantesService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  inativar(@Param('id', ParseIntPipe) id: number) {
    return this.solicitantesService.inativar(id);
  }
}
