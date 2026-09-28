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
import { ChavesService } from './chaves.service';
import { CriarChaveDto } from './dto/criar-chave.dto';
import { AtualizarChaveDto } from './dto/atualizar-chave.dto';
import { ListarChavesQueryDto } from './dto/listar-chaves.query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@ApiTags('chaves')
@Controller('chaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChavesController {
  constructor(private readonly chavesService: ChavesService) {}

  @Get()
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  listar(@Query() query: ListarChavesQueryDto) {
    return this.chavesService.listar(query);
  }

  @Get(':id')
  @Roles(
    PerfilAdministrador.ADMINISTRADOR,
    PerfilAdministrador.GESTOR,
    PerfilAdministrador.SOLICITANTE,
  )
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.chavesService.buscar(id);
  }

  @Post()
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  criar(@Body() dto: CriarChaveDto) {
    return this.chavesService.criar(dto);
  }

  @Patch(':id')
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarChaveDto,
  ) {
    return this.chavesService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  inativar(@Param('id', ParseIntPipe) id: number) {
    return this.chavesService.inativar(id);
  }
}
