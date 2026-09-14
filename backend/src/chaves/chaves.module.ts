import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chave])],
  controllers: [ChavesController],
  providers: [ChavesService],
  exports: [ChavesService],
})
export class ChavesModule {}
