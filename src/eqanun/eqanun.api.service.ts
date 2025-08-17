import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface EqanunApiItem {
  id: number;
  title: string;
  typeName: string;      // e.g. "AZƏRBAYCAN RESPUBLİKASI PREZİDENTİNİN FƏRMANLARI"
  statusName: string;    // e.g. "Qüvvədədir"
  acceptDate: string | null; // "14.08.2025"
  classCode: string | null;  // "2025-08-14"
}

export interface EqanunPage {
  data: EqanunApiItem[];
  totalCount: number;
}

@Injectable()
export class EqanunApiService {
  private readonly logger = new Logger(EqanunApiService.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.e-qanun.az',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EqanunBot/1.0)',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://e-qanun.az',
        'Referer': 'https://e-qanun.az/',
        'Accept-Language': 'az,en;q=0.9',
      },
      // e-qanun API is CORS-enabled for their site, but server-to-server calls are fine
      validateStatus: () => true,
    });
  }

  /**
   * Fetch a page ordered by date desc (orderColumn=8, orderDirection=desc)
   * start: offset (0-based), length: page size (1..200)
   * You can tune other filters: codeType, dateType, statusId, etc.
   */
  async fetchPage(start = 0, length = 100): Promise<EqanunPage> {
    const params = {
      start,
      length,
      orderColumn: 8,
      orderDirection: 'desc',
      title: true,
      codeType: 1,
      dateType: 1,
      statusId: 1,
      secondType: 4,
      specialDate: false,
      array: '',
    };

    const res = await this.http.get('/getDetailSearch', { params });
    if (res.status !== 200 || !res.data) {
      this.logger.warn(`API returned ${res.status}`);
      return { data: [], totalCount: 0 };
    }

    const data = (res.data.data ?? []) as EqanunApiItem[];
    const totalCount = Number(res.data.totalCount ?? 0);
    return { data, totalCount };
  }

  async uniqueTypeNames(limit = 200): Promise<string[]> {
    const page = await this.fetchPage(0, limit);
    const set = new Set<string>();
    page.data.forEach((i) => i.typeName && set.add(i.typeName));
    return Array.from(set);
  }
}
