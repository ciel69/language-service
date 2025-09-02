import { Module } from '@nestjs/common';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { HttpModule } from '@nestjs/axios';
import { RedisCacheModule } from '../../redis-cache.module';

@Module({
  imports: [HttpModule, RedisCacheModule],
  controllers: [TtsController],
  providers: [TtsService],
})
export class TtsModule {}
