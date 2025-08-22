import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { createHash, createHmac } from 'crypto';

@Injectable()
export class OAuthValidationService {
  private readonly logger = new Logger(OAuthValidationService.name);

  constructor(private readonly httpService: HttpService) {}

  // Валидация данных Telegram widget
  async validateTelegramWidgetData(widgetData: any): Promise<boolean> {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        this.logger.warn('TELEGRAM_BOT_TOKEN not configured');
        return false;
      }

      // Проверяем обязательные поля
      if (!widgetData.id || !widgetData.hash || !widgetData.auth_date) {
        return false;
      }

      // Проверяем, что auth_date не слишком старая (например, не старше 1 минуты)
      const authDate = parseInt(widgetData.auth_date, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 60) {
        this.logger.warn('Telegram widget data is too old');
        return false;
      }

      // Достаём hash и убираем его из объекта
      const { hash, ...data } = widgetData;

      // Сортируем параметры и создаем строку для хэширования
      const dataCheckString = Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join('\n');

      // Секретный ключ = sha256(botToken)
      const secretKey = createHash('sha256').update(botToken).digest();

      // Делаем HMAC-SHA256
      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      return calculatedHash === hash;
    } catch (error) {
      this.logger.error('Telegram widget validation failed:', error.message);
      return false;
    }
  }

  // Валидация VK токена
  async validateVKToken(userId: string, token: string): Promise<boolean> {
    try {
      const appId = process.env.VK_APP_ID;
      const appSecret = process.env.VK_APP_SECRET;

      if (!appId || !appSecret) {
        this.logger.warn('VK_APP_ID or VK_APP_SECRET not configured');
        return false;
      }

      const url = `https://api.vk.com/method/users.get?access_token=${token}&v=5.131&user_ids=${userId}`;

      const response = await this.httpService.get(url).toPromise();

      // Проверяем, что токен валиден и возвращает правильного пользователя
      return response?.data?.response?.[0]?.id?.toString() === userId;
    } catch (error) {
      this.logger.error('VK token validation failed:', error.message);
      return false;
    }
  }

  // Валидация Яндекс токена
  async validateYandexToken(
    token: string,
  ): Promise<{ valid: boolean; userId?: string; email?: string }> {
    try {
      const url = 'https://login.yandex.ru/info?format=json';

      const response = await this.httpService
        .get(url, {
          headers: {
            Authorization: `OAuth ${token}`,
          },
        })
        .toPromise();

      if (response?.data?.id) {
        return {
          valid: true,
          userId: String(response?.data?.id),
          email: String(
            response?.data?.default_email || response?.data.emails?.[0],
          ),
        };
      }

      return { valid: false };
    } catch (error) {
      this.logger.error('Yandex token validation failed:', error.message);
      return { valid: false };
    }
  }

  // Универсальный метод валидации
  async validateOAuthData(
    provider: 'telegram' | 'vk' | 'yandex',
    data: any,
  ): Promise<{
    valid: boolean;
    userId?: string;
    name?: string;
    email?: string;
  }> {
    switch (provider) {
      case 'telegram':
        const isValid = await this.validateTelegramWidgetData(data);
        if (isValid) {
          return {
            valid: true,
            userId: data.id,
            name:
              `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
              'Telegram User',
          };
        }
        return { valid: false };

      case 'vk':
        if (!data.id || !data.token) return { valid: false };
        const vkValid = await this.validateVKToken(data.id, data.token);
        if (vkValid) {
          return {
            valid: true,
            userId: data.id,
            name: data.name || 'VK User',
          };
        }
        return { valid: false };

      case 'yandex':
        if (!data.token) return { valid: false };
        const yandexResult = await this.validateYandexToken(data.token);
        return {
          valid: yandexResult.valid,
          userId: yandexResult.userId,
          email: yandexResult.email,
          name: 'Yandex User',
        };

      default:
        return { valid: false };
    }
  }
}
