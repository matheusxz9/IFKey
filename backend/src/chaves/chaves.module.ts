import { Module } from '@nestjs/common';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';

@Module({
  controllers: [ChavesController],
  providers: [ChavesService]
})
export class ChavesModule {}
