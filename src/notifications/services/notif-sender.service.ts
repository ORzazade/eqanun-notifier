import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { Outbox } from '../entities/outbox.entity';
import { TelegramServiceX } from '../../telegram/telegram.service';

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]!));
}

@Injectable()
export class NotifSenderService {
  private readonly logger = new Logger(NotifSenderService.name);
  constructor(private readonly ds: DataSource, private readonly tg: TelegramServiceX) {}

  @Cron('0 * * * * *', { timeZone: process.env.TZ || 'Asia/Baku' })
  async send() {
    await this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(Outbox);
      const jobs = await repo.find({
        where: { kind: 'USER_NOTIFICATION', status: 'NEW' },
        take: 100,
        order: { createdAt: 'ASC' },
      });
      for (const job of jobs) {
        const p = job.payload;
        const text =
          `${p.updated ? '🔁' : '🆕'} <b>${escapeHtml(p.title)}</b>\n` +
          `<i>${escapeHtml(p.category)}</i>\n` +
          `${p.url}`;
        try {
          await this.tg.sendMessage(String(p.telegramChatId), text, true /* html */);
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
