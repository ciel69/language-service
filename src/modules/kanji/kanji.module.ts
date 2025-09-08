import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KanjiService } from './kanji.service';
import { KanjiController } from './kanji.controller';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiPack } from '@/modules/kanji/entities/kanji-pack.entity';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';
import { User } from '@/modules/user/entities/user.entity';
import { SrsService } from '@/services/srs.service';
import { KanjiLessonGeneratorService } from '@/modules/kanji/kanji-lesson-generator.service';
import { KanjiProgress } from '@/modules/progress/entities/kanji-progress.entity';
import { KanjiPackProgressService } from '@/modules/kanji/kanji-pack-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Kanji,
      KanjiPack,
      KanjiPackProgress,
      KanjiProgress,
    ]),
  ],
  controllers: [KanjiController],
  providers: [
    KanjiService,
    SrsService,
    KanjiLessonGeneratorService,
    KanjiPackProgressService,
  ],
})
export class KanjiModule {}
