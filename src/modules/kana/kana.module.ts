import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KanaService } from './kana.service';
import { KanaController } from './kana.controller';
import { Kana } from '@/modules/kana/entities/kana.entity';
import { SrsService } from '@/services/srs.service';
import { KanaProgress } from '@/modules/progress/entities/kana-progress.entity';
import { User } from '@/modules/user/entities/user.entity';
import { AuthModule } from '@/modules/auth/auth.module';
import { LessonGeneratorService } from '@/services/lesson-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([KanaProgress, Kana, User]), AuthModule],
  controllers: [KanaController],
  providers: [KanaService, SrsService, LessonGeneratorService],
})
export class KanaModule {}
