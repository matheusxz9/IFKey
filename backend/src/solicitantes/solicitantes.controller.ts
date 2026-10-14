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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SolicitantesService } from './solicitantes.service';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@ApiTags('solicitantes')
@Controller('solicitantes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitantesController {
  constructor(private readonly solicitantesService: SolicitantesService) {}

  @Get()
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  listar(@Query() query: ListarSolicitantesQueryDto) {
    return this.solicitantesService.listar(query);
  }

  @Get(':id')
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.solicitantesService.buscar(id);
  }

  @Post()
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  criar(@Body() dto: CriarSolicitanteDto) {
    return this.solicitantesService.criar(dto);
  }

  @Patch(':id')
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarSolicitanteDto,
  ) {
    return this.solicitantesService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  inativar(@Param('id', ParseIntPipe) id: number) {
    return this.solicitantesService.inativar(id);
  }
}
