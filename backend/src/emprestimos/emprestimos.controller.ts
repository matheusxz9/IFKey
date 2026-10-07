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

@ApiTags('emprestimos')
@Controller('emprestimos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmprestimosController {
  constructor(private readonly emprestimosService: EmprestimosService) {}

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
  ) {
    return this.emprestimosService.devolver(id, dto);
  }

  @Get()
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  listar(@Query() query: ListarEmprestimosQueryDto) {
    return this.emprestimosService.listar(query);
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
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.emprestimosService.buscar(id);
  }
}
