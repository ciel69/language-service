import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { LessonTask } from '@/lesson/entities/lesson-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, LessonTask])],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}
