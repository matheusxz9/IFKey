import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdministradoresModule } from './administradores/administradores.module';
import { SolicitantesModule } from './solicitantes/solicitantes.module';
import { ChavesModule } from './chaves/chaves.module';
import { EmprestimosModule } from './emprestimos/emprestimos.module';
import { Administrador } from './administradores/administrador.entity';
import { Solicitante } from './solicitantes/solicitante.entity';
import { Chave } from './chaves/chave.entity';
import { Emprestimo } from './emprestimos/emprestimo.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'db',
        port: configService.get<number>('DB_PORT') || 5432,
        username: configService.get<string>('DB_USERNAME') || 'postgres',
        password: configService.get<string>('DB_PASSWORD') || 'postgres',
        database: configService.get<string>('DB_NAME') || 'ifkey_db',
        entities: [Administrador, Solicitante, Chave, Emprestimo],
        migrations: [`${__dirname}/migrations/*.js`],
        migrationsTableName: 'migrations',
      }),
    }),
    AdministradoresModule,
    SolicitantesModule,
    ChavesModule,
    EmprestimosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}