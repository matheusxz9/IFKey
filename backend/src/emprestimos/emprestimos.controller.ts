import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmprestimosService } from './emprestimos.service';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { DevolverEmprestimoDto } from './dto/devolver-emprestimo.dto';
import { ListarEmprestimosQueryDto } from './dto/listar-emprestimos.query.dto';
import { HistoricoEmprestimosQueryDto } from './dto/historico-emprestimos.query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('emprestimos')
@Controller('emprestimos')
export class EmprestimosController {
  constructor(private readonly emprestimosService: EmprestimosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  criar(@Body() dto: CriarEmprestimoDto, @CurrentUser() user: { id: number }) {
    return this.emprestimosService.criar(dto, user.id);
  }

  @Patch(':id/devolucao')
  @UseGuards(JwtAuthGuard)
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverEmprestimoDto,
  ) {
    return this.emprestimosService.devolver(id, dto);
  }

  @Get()
  listar(@Query() query: ListarEmprestimosQueryDto) {
    return this.emprestimosService.listar(query);
  }

  @Get('historico')
  historico(@Query() query: HistoricoEmprestimosQueryDto) {
    return this.emprestimosService.historico(query);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.emprestimosService.buscar(id);
  }
}
