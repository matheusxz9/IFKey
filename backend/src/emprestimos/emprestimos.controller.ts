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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.service';
import { PERFIS_ATENDIMENTO } from '../common/enums/perfil-administrador.enum';

@ApiTags('emprestimos')
@Controller('emprestimos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmprestimosController {
  constructor(private readonly emprestimosService: EmprestimosService) {}

  @Post()
  @Roles(...PERFIS_ATENDIMENTO)
  criar(
    @Body() dto: CriarEmprestimoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.emprestimosService.criar(dto, user.id, user.perfil);
  }

  @Patch(':id/devolucao')
  @Roles(...PERFIS_ATENDIMENTO)
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverEmprestimoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.emprestimosService.devolver(id, dto, user);
  }

  @Get()
  @Roles(...PERFIS_ATENDIMENTO)
  listar(
    @Query() query: ListarEmprestimosQueryDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.emprestimosService.listar(query, user);
  }

  @Get('historico')
  @Roles(...PERFIS_ATENDIMENTO)
  historico(
    @Query() query: HistoricoEmprestimosQueryDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.emprestimosService.historico(query, user);
  }

  @Get(':id')
  @Roles(...PERFIS_ATENDIMENTO)
  buscar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.emprestimosService.buscar(id, user);
  }
}
