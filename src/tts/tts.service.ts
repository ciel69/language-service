import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';

@Injectable()
export class TtsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  async generateVoice(params: {
    text: string;
    speaker?: number;
    volume?: number;
    speed?: number;
    pitch?: number;
  }): Promise<Buffer> {
    const cacheKey = this.generateCacheKey(params);

    // Try to get from cache first
    const cachedAudio = await this.cacheManager.get<Buffer>(cacheKey);
    if (cachedAudio) {
      return cachedAudio;
    }

    // Generate new audio from VOICEVOX
    const audioBuffer = await this.generateFromVoiceVox(params);

    // Cache the result
    await this.cacheManager.set(cacheKey, audioBuffer);

    return audioBuffer;
  }

  private async generateFromVoiceVox(params: {
    text: string;
    speaker?: number;
    volume?: number;
    speed?: number;
    pitch?: number;
  }): Promise<Buffer> {
    const { text, speaker = 1, volume = 1, speed = 1, pitch = 0 } = params;

    const audioQuery = await firstValueFrom<{
      data: {
        volumeScale: number;
        speedScale: number;
        pitchScale: number;
      };
    }>(
      this.httpService.post(
        `http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      ),
    );

    audioQuery.data.volumeScale = volume;
    audioQuery.data.speedScale = speed;
    audioQuery.data.pitchScale = pitch;

    const response = await firstValueFrom(
      this.httpService.post(
        `http://localhost:50021/synthesis?speaker=${speaker}`,
        audioQuery.data,
        { responseType: 'arraybuffer' },
      ),
    );

    return Buffer.from(response.data);
  }

  private generateCacheKey(params: {
    text: string;
    speaker?: number;
    volume?: number;
    speed?: number;
    pitch?: number;
  }): string {
    const hash = createHash('sha256')
      .update(
        `${params.speaker}:${params.text}:${params.volume}:${params.speed}:${params.pitch}`,
      )
      .digest('hex');
    return `voicevox:${hash}`;
  }

  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    keys: unknown;
  }> {
    const keys = await this.cacheManager.get('voicevox:*');
    return {
      hits: 0, // You would track these in production
      misses: 0,
      keys,
    };
  }
}
