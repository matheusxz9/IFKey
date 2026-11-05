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
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';
import { RepassarEmprestimoDto } from './dto/repassar-emprestimo.dto';

@ApiTags('emprestimos')
@Controller('emprestimos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmprestimosController {
  constructor(private readonly emprestimosService: EmprestimosService) {}

  @Post(':id/repasses')
  @Roles(PerfilAdministrador.SOLICITANTE)
  repassar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RepassarEmprestimoDto,
    @CurrentUser() user: { id: number; perfil: string },
  ) {
    return this.emprestimosService.repassar(id, dto, user);
  }

  @Post()
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  criar(
    @Body() dto: CriarEmprestimoDto,
    @CurrentUser() user: { id: number; perfil: string },
  ) {
    return this.emprestimosService.criar(dto, user.id, user.perfil);
  }

  @Patch(':id/devolucao')
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverEmprestimoDto,
    @CurrentUser() user: { id: number; perfil: string },
  ) {
    return this.emprestimosService.devolver(id, dto, user);
  }

  @Get()
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  listar(
    @Query() query: ListarEmprestimosQueryDto,
    @CurrentUser() user: { id: number; perfil: string },
  ) {
    return this.emprestimosService.listar(query, user);
  }

  @Get('historico')
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  historico(
    @Query() query: HistoricoEmprestimosQueryDto,
    @CurrentUser() user: { id: number; perfil: string },
  ) {
    return this.emprestimosService.historico(query, user);
  }

  @Get(':id')
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  buscar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; perfil: string },
  ) {
    return this.emprestimosService.buscar(id, user);
  }
}
