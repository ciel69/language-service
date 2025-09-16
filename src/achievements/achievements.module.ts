import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { Achievement } from '@/achievements/entities/achievement.entity';
import { UserAchievement } from '@/achievements/entities/user-achievement.entity';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, UserStat]),
    UserModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
