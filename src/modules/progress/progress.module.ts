import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProgressController } from './progress.controller';

import { GrammarProgress } from '@/modules/progress/entities/grammar-progress.entity';
import { KanaProgress } from '@/modules/progress/entities/kana-progress.entity';
import { KanjiProgress } from '@/modules/progress/entities/kanji-progress.entity';
import { LessonProgress } from '@/modules/progress/entities/lesson-progress.entity';
import { WordProgress } from '@/modules/progress/entities/word-progress.entity';

import { KanaProgressService } from '@/modules/progress/kana-progress.service';
import { WordProgressService } from '@/modules/progress/word-progress.service';
import { KanjiProgressService } from '@/modules/progress/kanji-progress.service';
import { GrammarProgressService } from '@/modules/progress/grammar-progress.service';
import { LessonProgressService } from '@/modules/progress/lesson-progress.service';
import { LessonModuleProgress } from '@/modules/progress/entities/lesson-module-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonModuleProgress,
      LessonProgress,
      GrammarProgress,
      WordProgress,
      KanjiProgress,
      KanaProgress,
    ]),
  ],
  controllers: [ProgressController],
  providers: [
    KanaProgressService,
    WordProgressService,
    KanjiProgressService,
    LessonProgressService,
    GrammarProgressService,
  ],
})
export class ProgressModule {}
