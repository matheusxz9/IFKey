import { Module } from '@nestjs/common';
import { EmprestimosController } from './emprestimos.controller';
import { EmprestimosService } from './emprestimos.service';

@Module({
  controllers: [EmprestimosController],
  providers: [EmprestimosService],
})
export class EmprestimosModule {}
