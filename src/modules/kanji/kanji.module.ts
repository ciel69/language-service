import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KanjiService } from './kanji.service';
import { KanjiController } from './kanji.controller';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiPack } from '@/modules/kanji/entities/kanji-pack.entity';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Kanji, KanjiPack, KanjiPackProgress])],
  controllers: [KanjiController],
  providers: [KanjiService],
})
export class KanjiModule {}
