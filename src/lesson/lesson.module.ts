import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { LessonTask } from '@/lesson/entities/lesson-task.entity';
import { LessonModule as LessonModuleEntity } from '@/lesson/entities/lesson-module.entity';
import { LessonProgress } from '@/progress/entities/lesson-progress.entity';

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
