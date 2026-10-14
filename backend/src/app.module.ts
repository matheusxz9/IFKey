import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { AuthModule } from './auth/auth.module';
import { RefreshToken } from './auth/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL') || 60000,
          limit: configService.get<number>('THROTTLE_LIMIT') || 100,
        },
      ],
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
        entities: [Administrador, Solicitante, Chave, Emprestimo, RefreshToken],
        migrations: [`${__dirname}/migrations/*.js`],
        migrationsTableName: 'migrations',
        retryAttempts: 60,
        retryDelay: 3000,
      }),
    }),
    AdministradoresModule,
    SolicitantesModule,
    ChavesModule,
    EmprestimosModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
