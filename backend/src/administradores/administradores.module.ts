import { Module } from '@nestjs/common';
import { AdministradoresController } from './administradores.controller';
import { AdministradoresService } from './administradores.service';

@Module({
  controllers: [AdministradoresController],
  providers: [AdministradoresService]
})
export class AdministradoresModule {}
