// src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

interface LmStudioResponse {
  message: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  ACCESS_ID = String(process.env.TIMEWEB_ACCESS_ID);
  private readonly LM_STUDIO_URL = `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${this.ACCESS_ID}/call`;
  private readonly MODEL_NAME =
    process.env.LM_STUDIO_MODEL || 'qwen2.5:7b-instruct';

  constructor(private readonly httpService: HttpService) {}

  async ask(question: string, context?: string): Promise<string> {
    const baseSystemPrompt = `
Выступи в роли краткого и точного учителя японского языка для русскоязычных.  
Ты ОБЯЗАН соблюдать следующие правила:

1. Отвечай ТОЛЬКО на русском языке.
2. Никогда не используй английские слова (например: means, saying, expression, for example, this is и т.п.).
3. Не добавляй лишних объяснений. Только суть.
4. Если вопрос — как перевести фразу, сразу пиши перевод, затем — пример.
5. Не используй квадратные скобки [], смайлы, звёздочки, Markdown.
6. Не придумывай транслитерацию. Используй стандартную ромадзи.
7. Отвечай в 1–3 предложениях. Не больше
    `.trim();

    const messages = [{ role: 'system', content: baseSystemPrompt }];

    if (context) {
      messages.push({
        role: 'system',
        content: `Контекст упражнения (важно использовать для ответа): ${context}`,
      });
    }

    messages.push({ role: 'user', content: question });

    try {
      this.logger.log(`Отправляю в AI: ${question}`);
      if (context) this.logger.debug(`С контекстом: ${context}`);

      const response: AxiosResponse<LmStudioResponse> = await firstValueFrom(
        this.httpService.post(this.LM_STUDIO_URL, {
          message: question,
          parent_message_id: '',
        }),
      );

      const content = response.data.message.trim();
      this.logger.debug(`Ответ от AI: ${content}`);

      return content;
    } catch (error) {
      this.logger.error(
        'Ошибка при запросе к LM Studio',
        error.response?.data || error.message,
      );
      throw new Error(
        'Не удалось получить ответ от AI. Проверь, запущен ли LM Studio на http://localhost:1234',
      );
    }
  }
}
