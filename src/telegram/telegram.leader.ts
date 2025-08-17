import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramLeader implements OnModuleInit {
  private readonly logger = new Logger(TelegramLeader.name);
  private readonly lockKey = 424242; // any 32/64-bit integer

  constructor(private readonly ds: DataSource, @InjectBot() private readonly bot: Telegraf) {}

  async onModuleInit() {
    // Acquire advisory lock so only one replica starts polling
    const [{ pg_try_advisory_lock }] = await this.ds.query(
      'SELECT pg_try_advisory_lock($1) AS pg_try_advisory_lock',
      [this.lockKey],
    );
    if (!pg_try_advisory_lock) {
      this.logger.warn('Another instance owns the bot lock; skipping bot.launch()');
      return;
    }
    this.logger.log('Lock acquired; starting bot polling');
    await this.bot.launch();
  }
}
