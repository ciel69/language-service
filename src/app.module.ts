import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordModule } from './word/word.module';
import { KanjiModule } from './kanji/kanji.module';
import { GrammarModule } from './grammar/grammar.module';
import { LessonModule } from './lesson/lesson.module';
import { UserModule } from './user/user.module';
import { ProgressModule } from './progress/progress.module';
import { KanaModule } from './kana/kana.module';
import { LearningModule } from './learning/learning.module';

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
