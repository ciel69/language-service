import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from '@/modules/lesson/entities/lesson.entity';
import { LessonTask } from '@/modules/lesson/entities/lesson-task.entity';
import { LessonModule as LessonModuleEntity } from '@/modules/lesson/entities/lesson-module.entity';
import { LessonProgress } from '@/modules/progress/entities/lesson-progress.entity';
import { KanaLessonGeneratorService } from '@/modules/lesson/services/kana-lesson-generator.service';
import { SrsService } from '@/services/srs.service';
import { LessonUtilsService } from '@/modules/lesson/services/lesson-utils.service';
import { KanaTaskFactoryService } from '@/modules/lesson/services/kana-task-factory.service';
import { LessonTheoryPage } from '@/modules/lesson/entities/lesson-theory-page.entity';
import { UserService } from '@/modules/user/user.service';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([
      LessonProgress,
      LessonModuleEntity,
      Lesson,
      LessonTask,
      LessonTheoryPage,
    ]),
  ],
  controllers: [LessonController],
  providers: [
    LessonService,
    SrsService,
    KanaLessonGeneratorService,
    LessonUtilsService,
    KanaTaskFactoryService,
  ],
  exports: [KanaLessonGeneratorService],
})
export class LessonModule {}
