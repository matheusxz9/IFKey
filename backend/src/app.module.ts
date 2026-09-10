import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { RelatoriosService } from './relatorios/relatorios.service';

@Module({
  imports: [AuthModule,RelatoriosModule],
  controllers: [AppController],
  providers: [AppService, RelatoriosService],
})
export class AppModule {}
