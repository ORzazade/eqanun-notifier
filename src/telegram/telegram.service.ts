import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramServiceX {
  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async sendMessage(chatId: string, text: string) {
    await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }
}
