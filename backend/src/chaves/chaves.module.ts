import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Chave, Emprestimo]), AuthModule],
  controllers: [ChavesController],
  providers: [ChavesService],
  exports: [ChavesService],
})
export class ChavesModule {}
