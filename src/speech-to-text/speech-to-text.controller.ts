import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechToTextService } from './speech-to-text.service';

@Controller('stt')
export class SpeechToTextController {
  constructor(private readonly sttService: SpeechToTextService) {}

  @Post('recognize')
  @UseInterceptors(FileInterceptor('audio'))
  async recognize(@UploadedFile() file: Express.Multer.File) {
    return this.sttService.recognizeSpeech(file.buffer, file.originalname);
  }
}
