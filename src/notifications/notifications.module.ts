import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outbox } from './entities/outbox.entity';
import { NotifPlannerService } from './services/notif-planner.service';
import { NotifSenderService } from './services/notif-sender.service';
import { LegalAct } from '../acts/entities/legal-act.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../subscriptions/entities/user.entity';
import { TelegramModuleX } from '../telegram/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([Outbox, LegalAct, Subscription, User]), TelegramModuleX],
  providers: [NotifPlannerService, NotifSenderService],
})
export class NotificationsModule {}
