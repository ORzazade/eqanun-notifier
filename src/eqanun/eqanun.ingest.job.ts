import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ActsService } from '../acts/services/acts.service';
import { EqanunApiService } from './eqanun.api.service';
import { apiItemToRawAct } from './eqanun.mapper';

@Injectable()
export class EqanunIngestJob {
  private readonly logger = new Logger(EqanunIngestJob.name);
  private readonly pageSize = 100;

  constructor(
    private readonly api: EqanunApiService,
    private readonly acts: ActsService,
  ) {}

  // every 30 minutes between 08:00 and 23:30 local time (last run at 23:30)
  @Cron('0 */30 8-23 * * *', { timeZone: process.env.TZ || 'Asia/Baku' })
  async runCron() {
    await this.performIngest();
  }

  // manual trigger stays, now uses the API path too
  async manual() {
    return this.performIngest(true);
  }

  private async performIngest(manual = false) {
    const lastSeen = await this.acts.getLastSeenId(); 
    const initialLoad = lastSeen == null;
    this.logger.log(`${manual ? '[manual] ' : ''}Starting ingest via API. lastSeenEqanunId=${lastSeen ?? 'none'}${initialLoad ? ' (initial full load)' : ''}`);

    let start = 0;
    let maxId = lastSeen ?? 0;
    const toIngest: ReturnType<typeof apiItemToRawAct>[] = [];
    let totalCount: number | null = null;

    while (true) {
      this.logger.debug(`Fetching page offset=${start} size=${this.pageSize}${initialLoad && totalCount !== null ? ` total=${totalCount}` : ''}`);
      let page;
      try {
        page = await this.api.fetchPage(start, this.pageSize);
      } catch (e) {
        this.logger.error(`Page fetch failed at offset=${start}: ${e}`);
        break;
      }
      if (!page.data.length) {
        this.logger.debug(`Empty page at offset=${start} -> stopping`);
        break;
      }
      if (totalCount === null) totalCount = page.totalCount || 0;

      const ids = page.data.map(i => i.id).sort((a, b) => a - b);
      const pageMin = ids[0];
      const pageMax = ids[ids.length - 1];
      this.logger.debug(`Received ${page.data.length} items (id range ${pageMin}-${pageMax})`);

      let newOnPage = 0;
      for (const item of page.data) {
        if (!initialLoad && lastSeen && item.id <= lastSeen) continue;
        newOnPage++;
        toIngest.push(apiItemToRawAct(item));
        if (item.id > maxId) maxId = item.id;
      }

      this.logger.debug(`Page offset=${start}: added=${newOnPage}, cumulativeNew=${toIngest.length}`);

      if (!initialLoad) {
        // Incremental mode stop criteria
        if (newOnPage === 0) {
          this.logger.debug(`All items on page offset=${start} are already ingested (<= lastSeen). Stopping pagination.`);
          break;
        }
      } else {
        // Initial full load progress log every 10 pages
        if ((start / this.pageSize) % 10 === 0) {
          this.logger.log(`[initial-load] Progress: fetched ${toIngest.length} / ${totalCount ?? '?'} (offset=${start})`);
        }
      }

      start += this.pageSize;

      if (initialLoad) {
        // Stop when we have reached or surpassed totalCount (if provided) or got a short page
        if ((totalCount !== null && start >= totalCount) || page.data.length < this.pageSize) {
          this.logger.debug(`[initial-load] Reached end (start=${start}, total=${totalCount}, pageSize=${page.data.length})`);
          break;
        }
      } else {
        // Safety bound only for incremental mode
        if (start > 5000) {
          this.logger.warn(`Reached pagination safety limit (start=${start}) in incremental mode. Stopping.`);
          break;
        }
      }
    }

    if (!toIngest.length) {
      this.logger.log(`${manual ? '[manual] ' : ''}No new acts found via API (lastSeen=${lastSeen ?? 'none'}).`);
      return { created: 0, updated: 0, maxId: lastSeen ?? 0, scanned: 0, initialLoad };
    }

    toIngest.sort((a, b) => a.eqanunId - b.eqanunId);
    const ingestMin = toIngest[0].eqanunId;
    const ingestMax = toIngest[toIngest.length - 1].eqanunId;
    this.logger.log(`Preparing to ingest ${toIngest.length} acts (range ${ingestMin}-${ingestMax})${initialLoad ? ' [initial-load]' : ''}`);

    const { created, updated } = await this.acts.ingestRawActs(toIngest, { initialLoad });
    this.logger.log(`${manual ? '[manual] ' : ''}Ingested summary: created=${created}, updated=${updated}, newMaxId=${maxId}${initialLoad ? ' [initial-load complete]' : ''}`);
    return { created, updated, maxId, scanned: toIngest.length, initialLoad };
  }
}
