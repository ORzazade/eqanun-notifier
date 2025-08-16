import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramUpdate } from './telegram.update';
import { TelegramServiceX } from './telegram.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../subscriptions/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
        return { token };
      },
    }),
    TypeOrmModule.forFeature([User, Subscription]),
  ],
  providers: [TelegramUpdate, TelegramServiceX],
  exports: [TelegramServiceX],
})
export class TelegramModuleX {}
