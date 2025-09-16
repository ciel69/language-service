import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { WordModule } from '@/modules/word/word.module';
import { KanjiModule } from '@/modules/kanji/kanji.module';
import { GrammarModule } from '@/modules/grammar/grammar.module';
import { LessonModule } from '@/modules/lesson/lesson.module';
import { UserModule } from '@/modules/user/user.module';
import { ProgressModule } from '@/modules/progress/progress.module';
import { KanaModule } from '@/modules/kana/kana.module';
import { LearningModule } from '@/modules/learning/learning.module';
import { TtsModule } from '@/modules/tts/tts.module';
import { SpeechToTextModule } from '@/modules/speech-to-text/speech-to-text.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { KeycloakModule } from '@/modules/keycloak/keycloak.module';
import { AiModule } from '@/modules/ai/ai.module';
import { PolicyModule } from '@/modules/policy/policy.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisCacheModule } from './redis-cache.module';
import { AchievementsModule } from './achievements/achievements.module';
import { redisOptions } from '@/config/redis';
import { StreakModule } from './streak/streak.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisCacheModule,
    BullModule.forRoot({
      connection: redisOptions,
    }),
    BullModule.registerQueue({
      name: 'achievement-check',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'db', // Используем имя сервиса из docker-compose
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'japanese_app',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: true, // Добавим логирование для отладки
    }),
    WordModule,
    KanjiModule,
    GrammarModule,
    LessonModule,
    ProgressModule,
    KanaModule,
    LearningModule,
    TtsModule,
    SpeechToTextModule,
    UserModule,
    AuthModule,
    KeycloakModule,
    AiModule,
    PolicyModule,
    AchievementsModule,
    StreakModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
