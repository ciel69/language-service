import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { TtsService } from './tts.service';
import { CreateTtDto } from './dto/create-tt.dto';
import { UpdateTtDto } from './dto/update-tt.dto';

@Controller('tts')
export class TtsController {
  constructor(
    private readonly ttsService: TtsService,
    private readonly httpService: HttpService,
  ) {}

  @Get('generate')
  async generateVoice(
    @Query()
    body: {
      text: string;
      speaker?: number;
      volume?: number; // Громкость (опционально)
      speed?: number; // Скорость (опционально)
      pitch?: number; // Тон (опционально)
    },
  ) {
    const { text, speaker = 1, volume = 2, speed = 1.1, pitch = 0 } = body;

    // 1. Запрос аудио-данных из VOICEVOX
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

    audioQuery.data.volumeScale = volume; // Увеличиваем громкость (1.2 = +20%)
    audioQuery.data.speedScale = speed; // Ускоряем речь (1.1 = +10%)
    audioQuery.data.pitchScale = pitch; // Ускоряем речь (1.1 = +10%)

    // 2. Генерация аудио (WAV)
    const response = await firstValueFrom(
      this.httpService.post(
        `http://localhost:50021/synthesis?speaker=${speaker}`,
        audioQuery.data,
        { responseType: 'arraybuffer' },
      ),
    );

    const buffer = Buffer.from(response.data);
    return new StreamableFile(buffer, {
      type: 'audio/wav',
      disposition: `attachment; filename="voice.wav"`,
    });
  }

  @Post()
  create(@Body() createTtDto: CreateTtDto) {
    return this.ttsService.create(createTtDto);
  }

  @Get()
  findAll() {
    return this.ttsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ttsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTtDto: UpdateTtDto) {
    return this.ttsService.update(+id, updateTtDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ttsService.remove(+id);
  }
}
