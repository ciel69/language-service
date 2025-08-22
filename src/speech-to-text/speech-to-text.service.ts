import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

// const VOSK_API_URL = process.env.VOSK_SERVICE_URL || 'http://vosk-server:5000';
const VOSK_API_URL = process.env.VOSK_SERVICE_URL || 'http://localhost:5000';

export type VoskRes = {
  text: string;
  original_text: string;
  confidence: number;
  sample_rate: number;
  language: 'ja';
};

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);

  constructor(private readonly httpService: HttpService) {}

  async recognizeSpeech(
    audioBuffer: Buffer,
    filename: string,
  ): Promise<VoskRes> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename,
        contentType: 'audio/wav',
      });
      this.logger.log('recognizeSpeech', VOSK_API_URL);
      const response = await firstValueFrom(
        this.httpService.post<VoskRes>(`${VOSK_API_URL}/recognize`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Vosk recognition error', error.message);
      throw new Error(`Recognition failed: ${error.message}`);
    }
  }
}
