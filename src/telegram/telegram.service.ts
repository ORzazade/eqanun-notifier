import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { i18n } from './i18n';

@Injectable()
export class TelegramServiceX implements OnModuleInit {
  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async onModuleInit() {
    // Azerbaijani commands
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: i18n.t('az', 'cmd_start') },
      { command: 'subscribe', description: i18n.t('az', 'cmd_subscribe') },
      { command: 'list', description: i18n.t('az', 'cmd_list') },
      { command: 'manage', description: i18n.t('az', 'cmd_manage') },
      // { command: 'topics', description: i18n.t('az', 'cmd_topics') },
      { command: 'lang', description: i18n.t('az', 'cmd_lang') },
      { command: 'help', description: i18n.t('az', 'cmd_help') },
    ], { language_code: 'az' });

    // English commands
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: i18n.t('en', 'cmd_start') },
      { command: 'subscribe', description: i18n.t('en', 'cmd_subscribe') },
      { command: 'list', description: i18n.t('en', 'cmd_list') },
      { command: 'manage', description: i18n.t('en', 'cmd_manage') },
      // { command: 'topics', description: i18n.t('en', 'cmd_topics') },
      { command: 'lang', description: i18n.t('en', 'cmd_lang') },
      { command: 'help', description: i18n.t('en', 'cmd_help') },
    ], { language_code: 'en' });

    // Fallback (Telegram shows default if user language not matched) – choose Azerbaijani as primary
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: i18n.t('az', 'cmd_start') },
      { command: 'subscribe', description: i18n.t('az', 'cmd_subscribe') },
      { command: 'list', description: i18n.t('az', 'cmd_list') },
      { command: 'manage', description: i18n.t('az', 'cmd_manage') },
      // { command: 'topics', description: i18n.t('az', 'cmd_topics') },
      { command: 'lang', description: i18n.t('az', 'cmd_lang') },
      { command: 'help', description: i18n.t('az', 'cmd_help') },
    ]);
  }

  async updateChatCommands(chatId: string, locale: string) {
    const lang = locale === 'en' ? 'en' : 'az';
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: i18n.t(lang, 'cmd_start') },
      { command: 'subscribe', description: i18n.t(lang, 'cmd_subscribe') },
      { command: 'list', description: i18n.t(lang, 'cmd_list') },
      { command: 'manage', description: i18n.t(lang, 'cmd_manage') },
      // { command: 'topics', description: i18n.t(lang, 'cmd_topics') },
      { command: 'lang', description: i18n.t(lang, 'cmd_lang') },
      { command: 'help', description: i18n.t(lang, 'cmd_help') },
    ], { scope: { type: 'chat', chat_id: Number(chatId) } });
  }

  async sendMessage(chatId: string, text: string, html = false) {
    await this.bot.telegram.sendMessage(chatId, text, {
      parse_mode: html ? 'HTML' : 'Markdown',
    });
  }
}
