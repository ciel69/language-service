import { Module } from '@nestjs/common';
import { WordService } from './word.service';
import { WordController } from './word.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from '@/modules/word/entities/word.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  controllers: [WordController],
  providers: [WordService],
})
export class WordModule {}
