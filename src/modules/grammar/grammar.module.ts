import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GrammarService } from './grammar.service';
import { GrammarController } from './grammar.controller';
import { Grammar } from '@/modules/grammar/entities/grammar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Grammar])],
  controllers: [GrammarController],
  providers: [GrammarService],
})
export class GrammarModule {}
