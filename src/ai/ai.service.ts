// src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

interface LmStudioResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly LM_STUDIO_URL =
    process.env.LM_STUDIO_URL || 'http://localhost:1234/v1/chat/completions';
  private readonly MODEL_NAME =
    process.env.LM_STUDIO_MODEL || 'qwen2.5:7b-instruct';

  constructor(private readonly httpService: HttpService) {}

  async ask(question: string, context?: string): Promise<string> {
    const baseSystemPrompt = `
Ты — краткий и точный учитель японского языка для русскоязычных.  
Ты ОБЯЗАН соблюдать следующие правила:

1. Отвечай ТОЛЬКО на русском языке.
2. Никогда не используй английские слова (например: means, saying, expression, for example, this is и т.п.).
3. Не добавляй лишних объяснений. Только суть.
4. Если вопрос — как перевести фразу, сразу пиши перевод, затем — пример.
5. Не используй квадратные скобки [], смайлы, звёздочки, Markdown.
6. Не придумывай транслитерацию. Используй стандартную ромадзи.
7. Отвечай в 1–3 предложениях. Не больше.
    `.trim();

    const messages = [{ role: 'system', content: baseSystemPrompt }];

    if (context) {
      messages.push({
        role: 'system',
        content: `Контекст упражнения (важно использовать для ответа): ${context}`,
      });
    }

    messages.push({ role: 'user', content: question });

    const payload = {
      model: this.MODEL_NAME,
      messages,
      temperature: 0.3,
      max_tokens: 200,
      stream: false,
    };

    try {
      this.logger.log(`Отправляю в AI: ${question}`);
      if (context) this.logger.debug(`С контекстом: ${context}`);

      const response: AxiosResponse<LmStudioResponse> = await firstValueFrom(
        this.httpService.post(this.LM_STUDIO_URL, payload),
      );

      const content = response.data.choices[0].message.content.trim();
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
