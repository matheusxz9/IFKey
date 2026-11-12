import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmprestimosController } from './emprestimos.controller';
import { EmprestimosService } from './emprestimos.service';
import { Emprestimo } from './emprestimo.entity';
import { RepasseEmprestimo } from './repasse-emprestimo.entity';
import { ChavesModule } from '../chaves/chaves.module';
import { SolicitantesModule } from '../solicitantes/solicitantes.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Emprestimo, RepasseEmprestimo]),
    ChavesModule,
    SolicitantesModule,
    AuthModule,
  ],
  controllers: [EmprestimosController],
  providers: [EmprestimosService],
})
export class EmprestimosModule {}
