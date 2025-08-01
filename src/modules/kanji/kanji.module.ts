import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KanjiService } from './kanji.service';
import { KanjiController } from './kanji.controller';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Kanji])],
  controllers: [KanjiController],
  providers: [KanjiService],
})
export class KanjiModule {}
