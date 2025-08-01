import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordModule } from '@/modules/word/word.module';
import { KanjiModule } from '@/modules/kanji/kanji.module';
import { GrammarModule } from '@/modules/grammar/grammar.module';
import { LessonModule } from '@/modules/lesson/lesson.module';
import { UserModule } from '@/modules/user/user.module';
import { ProgressModule } from '@/modules/progress/progress.module';
import { KanaModule } from '@/modules/kana/kana.module';
import { LearningModule } from '@/modules/learning/learning.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'japanese_app',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    WordModule,
    KanjiModule,
    GrammarModule,
    LessonModule,
    UserModule,
    ProgressModule,
    KanaModule,
    LearningModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
