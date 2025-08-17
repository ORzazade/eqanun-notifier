import { Module } from '@nestjs/common';
import { EqanunIngestJob } from './eqanun.ingest.job';
import { ActsModule } from '../acts/acts.module';
import { EqanunController } from './eqanun.controller';
import { EqanunApiService } from './eqanun.api.service';

@Module({
  imports: [ActsModule],
  providers: [EqanunApiService, EqanunIngestJob],
  controllers: [EqanunController],
  exports: [EqanunIngestJob, EqanunApiService],
})
export class EqanunModule { }
