import { Module } from '@nestjs/common';
import { SolicitantesController } from './solicitantes.controller';
import { SolicitantesService } from './solicitantes.service';

@Module({
  controllers: [SolicitantesController],
  providers: [SolicitantesService],
  exports: [SolicitantesService],
})
export class SolicitantesModule {}