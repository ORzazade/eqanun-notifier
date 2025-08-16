import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LegalAct } from '../entities/legal-act.entity';
import { ActEvent } from '../entities/act-event.entity';
import { SystemState } from '../entities/system-state.entity';
import { Outbox } from '../../notifications/entities/outbox.entity';

@Injectable()
export class ActsService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(LegalAct) private readonly actsRepo: Repository<LegalAct>,
    @InjectRepository(ActEvent) private readonly eventsRepo: Repository<ActEvent>,
    @InjectRepository(SystemState) private readonly stateRepo: Repository<SystemState>,
    @InjectRepository(Outbox) private readonly outboxRepo: Repository<Outbox>,
  ) {}

  async getLastSeenId(): Promise<number | null> {
    const s = await this.stateRepo.findOne({ where: { key: 'lastSeenEqanunId' } });
    return s ? Number(s.value) : null;
  }

  async ingestRawActs(rawActs: Array<{
    eqanunId: number; title: string; category: string; url: string;
    publishedDate?: string; contentHash?: string;
  }>, opts?: { initialLoad?: boolean }): Promise<{ created: number; updated: number; maxId: number }> {
    return this.ds.transaction(async manager => {
      let created = 0, updated = 0, maxId = 0;

      for (const raw of rawActs) {
        const repoAct = manager.getRepository(LegalAct);
        const repoEvent = manager.getRepository(ActEvent);
        const repoOutbox = manager.getRepository(Outbox);

        const existing = await repoAct.findOne({ where: { eqanunId: raw.eqanunId } });
        if (!existing) {
          const safeTitle = raw.title.length > 12000 ? (() => {
            const t = raw.title.slice(0, 12000);
            // eslint-disable-next-line no-console
            console.warn(`Title truncated for eqanunId=${raw.eqanunId} originalLen=${raw.title.length}`);
            return t;
          })() : raw.title;
          const act = repoAct.create({
            eqanunId: raw.eqanunId,
            title: safeTitle,
            category: raw.category,
            url: raw.url,
            publishedDate: raw.publishedDate ? new Date(raw.publishedDate) : null,
            contentHash: raw.contentHash ?? null,
          });
          const saved = await repoAct.save(act);
          await repoEvent.save({ act: saved, type: 'CREATED', snapshot: { ...raw } });
          created++;
          maxId = Math.max(maxId, raw.eqanunId);
          if (!opts?.initialLoad) {
            await repoOutbox.save({
              kind: 'ACT_CHANGE_DETECTED',
              payload: { eqanunId: raw.eqanunId, event: 'CREATED' },
              status: 'NEW',
            });
          }
        } else {
          const safeTitle = raw.title.length > 12000 ? raw.title.slice(0, 12000) : raw.title;
          const changed = existing.contentHash !== (raw.contentHash ?? null) || existing.title !== safeTitle;
          if (changed) {
            existing.title = safeTitle;
            existing.category = raw.category;
            existing.publishedDate = raw.publishedDate ? new Date(raw.publishedDate) : null;
            existing.url = raw.url;
            existing.contentHash = raw.contentHash ?? null;
            const saved = await repoAct.save(existing);
            await repoEvent.save({ act: saved, type: 'UPDATED', snapshot: { ...raw } });
            updated++;
            if (!opts?.initialLoad) {
              await repoOutbox.save({
                kind: 'ACT_CHANGE_DETECTED',
                payload: { eqanunId: raw.eqanunId, event: 'UPDATED', updated: true },
                status: 'NEW',
              });
            }
          }
          maxId = Math.max(maxId, raw.eqanunId);
        }
      }

      if (maxId > 0) {
        await manager.getRepository(SystemState).save({ key: 'lastSeenEqanunId', value: String(maxId) });
      }

      return { created, updated, maxId };
    });
  }
}
