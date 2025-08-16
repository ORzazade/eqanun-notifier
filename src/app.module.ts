import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validateEnv } from './config/validation';

import { ActsModule } from './acts/acts.module';
import { EqanunModule } from './eqanun/eqanun.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TelegramModuleX } from './telegram/telegram.module';
import { HealthModule } from './health/health.module';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: true,
          migrations: ['dist/database/migrations/*.js'],
          ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          retryAttempts: 20,          // increased retries
          retryDelay: 3000,           // wait 3s between attempts
          keepConnectionAlive: true,  // keep pool if hot-reload
        };
      },
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('TypeORM DataSource options are undefined');
        }
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),
    ScheduleModule.forRoot(),
    ActsModule,
    EqanunModule,
    SubscriptionsModule,
    NotificationsModule,
    TelegramModuleX,
    HealthModule,
  ],
})
export class AppModule {}
