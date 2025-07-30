import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KanaService } from './kana.service';
import { KanaController } from './kana.controller';
import { Kana } from '@/kana/entities/kana.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Kana])],
  controllers: [KanaController],
  providers: [KanaService],
})
export class KanaModule {}
