import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { LearningSection } from '@/learning/entities/learning-section.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LearningSection])],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
