import { Module } from '@nestjs/common';
import { EmprestimosController } from './emprestimos.controller';
import { EmprestimosService } from './emprestimos.service';
import { ChavesModule } from '../chaves/chaves.module';
import { SolicitantesModule } from '../solicitantes/solicitantes.module';

@Module({
  imports: [ChavesModule, SolicitantesModule],
  controllers: [EmprestimosController],
  providers: [EmprestimosService],
})
export class EmprestimosModule {}
