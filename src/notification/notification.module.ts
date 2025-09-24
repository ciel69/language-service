import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from '@/achievements/entities/achievement.entity';
import { CurrencyAndStreakService } from '@/notification/currency-and-streak.service';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';
import { WebsocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserStat, UserDailyActivity]),
    WebsocketModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, CurrencyAndStreakService],
  exports: [NotificationService, CurrencyAndStreakService],
})
export class NotificationModule {}
