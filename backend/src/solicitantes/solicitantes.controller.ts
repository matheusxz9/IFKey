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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SolicitantesService } from './solicitantes.service';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';
import { ImportarSolicitantesDto } from './dto/importar-solicitantes.dto';
import { LIMITE_BYTES_IMPORTACAO } from '../common/importacao/csv';
import type { ArquivoCsv } from '../common/importacao/csv';

@ApiTags('solicitantes')
@Controller('solicitantes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitantesController {
  constructor(private readonly solicitantesService: SolicitantesService) {}

  @Post('importacao/previa')
  @HttpCode(200)
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  @UseInterceptors(
    FileInterceptor('arquivo', {
      limits: { fileSize: LIMITE_BYTES_IMPORTACAO },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { arquivo: { type: 'string', format: 'binary' } },
      required: ['arquivo'],
    },
  })
  previsualizar(@UploadedFile() arquivo?: ArquivoCsv) {
    return this.solicitantesService.previsualizar(arquivo);
  }

  @Post('importacao')
  @HttpCode(200)
  @Roles(PerfilAdministrador.ADMINISTRADOR, PerfilAdministrador.GESTOR)
  importar(@Body() dto: ImportarSolicitantesDto) {
    return this.solicitantesService.importar(dto.linhas);
  }

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
