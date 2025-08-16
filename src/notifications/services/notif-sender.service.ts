import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { Outbox } from '../entities/outbox.entity';
import { TelegramServiceX } from '../../telegram/telegram.service';

const TELEGRAM_LIMIT = 4096;

@Injectable()
export class NotifSenderService {
  private readonly logger = new Logger(NotifSenderService.name);
  constructor(private readonly ds: DataSource, private readonly tg: TelegramServiceX) {}

  @Cron('0 * * * * *', { timeZone: process.env.TZ || 'Asia/Baku' })
  async send() {
    await this.ds.transaction(async manager => {
      const repo = manager.getRepository(Outbox);
      const jobs = await repo.find({
        where: { kind: 'USER_NOTIFICATION', status: 'NEW' },
        take: 100,
        order: { createdAt: 'ASC' },
      });
      for (const job of jobs) {
        const p = job.payload;
        let title = p.title as string;
        // Fallback escape (in case older payloads exist)
        if (!title.includes('\\')) {
          try {
            // Lazy import to avoid circular
            const { escapeMarkdown } = require('../../common/utils/text.util');
            title = escapeMarkdown(title);
          } catch {
            /* ignore */
          }
        }
        let text = `${p.updated ? '🔁 Updated act' : '🆕 New act'}:\n*${title}*\n_${p.category}_\n${p.url}`;
        if (text.length > TELEGRAM_LIMIT) {
          const extra = text.length - TELEGRAM_LIMIT;
            // Trim title to fit
          const allowedTitleLen = Math.max(20, title.length - extra - 10);
          title = title.slice(0, allowedTitleLen) + '…';
          text = `${p.updated ? '🔁 Updated act' : '🆕 New act'}:\n*${title}*\n_${p.category}_\n${p.url}`;
        }
        try {
          await this.tg.sendMessage(String(p.telegramChatId), text);
          job.status = 'SENT';
        } catch (e) {
          job.attempts++;
          job.status = job.attempts >= 5 ? 'FAILED' : 'NEW';
          this.logger.warn(`Send failed (attempt ${job.attempts}) to ${p.telegramChatId}: ${e}`);
        }
        await repo.save(job);
      }
    });
  }
}
