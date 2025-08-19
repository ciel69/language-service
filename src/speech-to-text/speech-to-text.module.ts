import { Module } from '@nestjs/common';
import { SpeechToTextService } from './speech-to-text.service';
import { SpeechToTextController } from './speech-to-text.controller';
import { HttpModule } from '@nestjs/axios';
import { RedisCacheModule } from '@/redis-cache.module';

@Module({
  imports: [HttpModule, RedisCacheModule],
  controllers: [SpeechToTextController],
  providers: [SpeechToTextService],
})
export class SpeechToTextModule {}
