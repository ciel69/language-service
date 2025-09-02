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
import { TtsModule } from './tts/tts.module';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheModule } from './redis-cache.module';
import { SpeechToTextModule } from './speech-to-text/speech-to-text.module';
import { AuthModule } from './auth/auth.module';
import { KeycloakModule } from './keycloak/keycloak.module';
import { AiModule } from './ai/ai.module';
import { PolicyModule } from './policy/policy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisCacheModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
