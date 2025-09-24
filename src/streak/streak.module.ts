import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StreakService } from './streak.service';
import { StreakController } from './streak.controller';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDailyActivity, UserStat]),
    UserModule,
  ],
  controllers: [StreakController],
  providers: [StreakService],
})
export class StreakModule {}
