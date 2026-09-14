import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SolicitantesModule } from './solicitantes/solicitantes.module';
import { ChavesModule } from './chaves/chaves.module';
import { EmprestimosModule } from './emprestimos/emprestimos.module';

@Module({
  imports: [SolicitantesModule, ChavesModule, EmprestimosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
