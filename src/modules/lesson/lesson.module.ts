import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from '@/modules/lesson/entities/lesson.entity';
import { LessonTask } from '@/modules/lesson/entities/lesson-task.entity';
import { LessonModule as LessonModuleEntity } from '@/modules/lesson/entities/lesson-module.entity';
import { LessonProgress } from '@/modules/progress/entities/lesson-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonProgress,
      LessonModuleEntity,
      Lesson,
      LessonTask,
    ]),
  ],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}
