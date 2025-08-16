import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { Outbox } from '../entities/outbox.entity';
import { LegalAct } from '../../acts/entities/legal-act.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { User } from '../../subscriptions/entities/user.entity';
import { buildSafeTitleForTelegram } from '../../common/utils/text.util';

@Injectable()
export class NotifPlannerService {
  private readonly logger = new Logger(NotifPlannerService.name);
  constructor(private readonly ds: DataSource) {}

  @Cron('0 */5 * * * *', { timeZone: process.env.TZ || 'Asia/Baku' })
  async plan() {
    await this.ds.transaction(async manager => {
      const outboxRepo = manager.getRepository(Outbox);
      const pending = await outboxRepo.find({
        where: [
          { kind: 'NEW_ACTS_DETECTED', status: 'NEW' },     
          { kind: 'ACT_CHANGE_DETECTED', status: 'NEW' },  
        ],
        take: 200,
        order: { createdAt: 'ASC' },
      });
      if (!pending.length) return;

      const actRepo = manager.getRepository(LegalAct);
      const subsRepo = manager.getRepository(Subscription);

      for (const evt of pending) {
        const eqanunId = evt.payload.eqanunId as number;
        const act = await actRepo.findOne({ where: { eqanunId } });
        if (!act) { evt.status = 'FAILED'; await outboxRepo.save(evt); continue; }

        const subs = await subsRepo.find({ where: { isActive: true }, relations: ['user'] });
        for (const sub of subs) {
          if (this.matches(sub, act)) {
            const safe = buildSafeTitleForTelegram(act.title);
            await outboxRepo.save({
              kind: 'USER_NOTIFICATION',
              payload: {
                telegramChatId: sub.user.telegramChatId,
                eqanunId,
                title: safe.title,
                category: act.category,
                url: act.url,
                updated: !!evt.payload.updated,
                ...(safe.truncated ? { originalTitleLength: safe.originalLength } : {}),
              },
              status: 'NEW',
            });
          }
        }

        evt.status = 'SENT';
        await outboxRepo.save(evt);
      }
    });
  }

  private matches(sub: Subscription, act: LegalAct): boolean {
    if (sub.type === 'ALL') return true;
    if (sub.type === 'CATEGORY') {
      return (sub.query ?? '').toLowerCase() === act.category.toLowerCase();
    }
    if (sub.type === 'KEYWORD') {
      const q = (sub.query ?? '').toLowerCase();
      return act.title.toLowerCase().includes(q);
    }
    return false;
  }
}
