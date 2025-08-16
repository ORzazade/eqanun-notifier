import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalAct } from './entities/legal-act.entity';
import { ActEvent } from './entities/act-event.entity';
import { SystemState } from './entities/system-state.entity';
import { ActsService } from './services/acts.service';
import { Outbox } from '../notifications/entities/outbox.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LegalAct, ActEvent, SystemState, Outbox])],
  providers: [ActsService],
  exports: [ActsService],
})
export class ActsModule {}
