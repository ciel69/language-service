import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from '@/modules/lesson/entities/lesson.entity';
import { LessonTask } from '@/modules/lesson/entities/lesson-task.entity';
import { LessonModule as LessonModuleEntity } from '@/modules/lesson/entities/lesson-module.entity';
import { LessonProgress } from '@/modules/progress/entities/lesson-progress.entity';
import { KanaLessonGeneratorService } from '@/modules/lesson/services/kana/kana-lesson-generator.service';
import { SrsService } from '@/services/srs.service';
import { LessonUtilsService } from '@/modules/lesson/services/lesson-utils.service';
import { KanaTaskFactoryService } from '@/modules/lesson/services/kana/kana-task-factory.service';
import { LessonTheoryPage } from '@/modules/lesson/entities/lesson-theory-page.entity';

import { UserModule } from '@/modules/user/user.module';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';
import { LessonFactoryService } from '@/modules/lesson/factory/lesson-factory.service';
import { KanaService } from '@/modules/kana/kana.service';
import { Kana } from '@/modules/kana/entities/kana.entity';
import { KanaProgress } from '@/modules/progress/entities/kana-progress.entity';
import { User } from '@/modules/user/entities/user.entity';
import { KanjiService } from '@/modules/kanji/kanji.service';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiProgress } from '@/modules/progress/entities/kanji-progress.entity';
import { KanjiPack } from '@/modules/kanji/entities/kanji-pack.entity';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';
import { KanjiPackProgressService } from '@/modules/kanji/kanji-pack-progress.service';
import { KanjiLessonGeneratorService } from '@/modules/lesson/services/kanji/kanji-lesson-generator.service';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([
      LessonProgress,
      LessonModuleEntity,
      Lesson,
      LessonTask,
      LessonTheoryPage,
      User,
      UserStat,
      UserDailyActivity,
      Kana,
      Kanji,
      KanjiProgress,
      KanjiPack,
      KanjiPackProgress,
      KanaProgress,
    ]),
    NotificationModule,
  ],
  controllers: [LessonController],
  providers: [
    LessonService,
    SrsService,
    KanaService,
    KanjiService,
    KanjiPackProgressService,
    KanjiLessonGeneratorService,
    KanaLessonGeneratorService,
    LessonUtilsService,
    KanaTaskFactoryService,
    LessonFactoryService,
  ],
  exports: [
    KanaLessonGeneratorService,
    LessonFactoryService,
    LessonFactoryService,
  ],
})
export class LessonModule {}
