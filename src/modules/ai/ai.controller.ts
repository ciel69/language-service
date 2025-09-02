import { Controller, Post, Body } from '@nestjs/common';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  async ask(@Body() body: { message: string; parent_message_id: string }) {
    const answer = await this.aiService.ask(body);
    return answer;
  }
}
