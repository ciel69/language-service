import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { Achievement } from '@/achievements/entities/achievement.entity';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserModule } from '@/modules/user/user.module';
import { AchievementCheckProcessor } from '@/achievements/processors/achievement-check.processor';
import { Word } from '@/modules/word/entities/word.entity';
import { User } from '@/modules/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, User, UserStat, Word]),
    UserModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService, AchievementCheckProcessor],
  exports: [AchievementsService],
})
export class AchievementsModule {}
