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
import { AdministradoresService } from './administradores.service';
import { CriarAdministradorDto } from './dto/criar-administrador.dto';
import { AtualizarAdministradorDto } from './dto/atualizar-administrador.dto';
import { ListarAdministradoresQueryDto } from './dto/listar-administradores.query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@ApiTags('administradores')
@Controller('administradores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdministradoresController {
  constructor(
    private readonly administradoresService: AdministradoresService,
  ) {}

  @Get()
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  listar(@Query() query: ListarAdministradoresQueryDto) {
    return this.administradoresService.listar(query);
  }

  @Get(':id')
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.administradoresService.buscar(id);
  }

  @Post()
  @Roles(PerfilAdministrador.ADMINISTRADOR)
  criar(@Body() dto: CriarAdministradorDto) {
    return this.administradoresService.criar(dto);
  }

  @Patch(':id')
  @Roles(PerfilAdministrador.ADMINISTRADOR)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarAdministradorDto,
  ) {
    return this.administradoresService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(PerfilAdministrador.ADMINISTRADOR)
  inativar(@Param('id', ParseIntPipe) id: number) {
    return this.administradoresService.inativar(id);
  }
}
