import { Controller, Post, Query } from '@nestjs/common';
import { EqanunIngestJob } from './eqanun.ingest.job';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('eqanun')
@Controller('eqanun')
export class EqanunController {
  constructor(private readonly job: EqanunIngestJob) {}

  // POST /eqanun/ingest?steps=300
  @Post('ingest')
  @ApiOperation({ summary: 'Manually trigger ingest of new acts' })
  async ingest() {
    console.log('Manual ingest triggered');
    const result = await this.job.manual();
    return { ok: true, ...result };
  }
}
