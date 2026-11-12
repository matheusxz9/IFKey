import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitantesController } from './solicitantes.controller';
import { SolicitantesService } from './solicitantes.service';
import { Solicitante } from './solicitante.entity';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { Administrador } from '../administradores/administrador.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Solicitante, Emprestimo, Administrador]),
    AuthModule,
  ],
  controllers: [SolicitantesController],
  providers: [SolicitantesService],
  exports: [SolicitantesService],
})
export class SolicitantesModule {}
