import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProgressController } from './progress.controller';

import { GrammarProgress } from '@/progress/entities/grammar-progress.entity';
import { KanaProgress } from '@/progress/entities/kana-progress.entity';
import { KanjiProgress } from '@/progress/entities/kanji-progress.entity';
import { LessonProgress } from '@/progress/entities/lesson-progress.entity';
import { WordProgress } from '@/progress/entities/word-progress.entity';

import { KanaProgressService } from '@/progress/kana-progress.service';
import { WordProgressService } from '@/progress/word-progress.service';
import { KanjiProgressService } from '@/progress/kanji-progress.service';
import { GrammarProgressService } from '@/progress/grammar-progress.service';
import { LessonProgressService } from '@/progress/lesson-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
