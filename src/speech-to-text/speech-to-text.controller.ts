import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechToTextService } from './speech-to-text.service';
import { Public, Resource, Scopes } from 'nest-keycloak-connect';

@Controller('stt')
@Resource('stt')
export class SpeechToTextController {
  constructor(private readonly sttService: SpeechToTextService) {}

  @Post('recognize')
  @Public()
  @Scopes('recognize')
  @UseInterceptors(FileInterceptor('audio'))
  async recognize(@UploadedFile() file: Express.Multer.File) {
    return this.sttService.recognizeSpeech(file.buffer, file.originalname);
  }
}
