import { Controller, Get, Query, StreamableFile, Post } from '@nestjs/common';

import { TtsService } from './tts.service';
import { Public } from 'nest-keycloak-connect';

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Get('generate')
  @Public()
  async generateVoice(
    @Query()
    params: {
      text: string;
      speaker?: number;
      volume?: number;
      speed?: number;
      pitch?: number;
    },
  ) {
    const buffer = await this.ttsService.generateVoice(params);
    return new StreamableFile(buffer, {
      type: 'audio/wav',
      disposition: 'inline',
    });
  }

  @Post('clear-cache')
  async clearCache() {
    await this.ttsService.clearCache();
    return { message: 'Cache cleared successfully' };
  }

  @Get('cache-stats')
  async getCacheStats() {
    return await this.ttsService.getCacheStats();
  }
}
