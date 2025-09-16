// src/config/redis.ts

import { RedisOptions } from 'bullmq';

// Получаем переменные окружения — с дефолтами для локальной разработки
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

// Опционально: поддержка SSL для облачных Redis (например, Redis Cloud)
const REDIS_TLS = process.env.REDIS_TLS === 'true';

export const redisOptions: RedisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,
  // 🔐 Для облачных сервисов (Redis Labs, Upstash, AWS ElastiCache)
  tls: REDIS_TLS ? {} : undefined,
  // ⚙️ Дополнительные настройки для надёжности
  connectionName: 'achievements-queue',
  retryStrategy: (times: number) => {
    // Пытаемся переподключиться с экспоненциальной задержкой
    const delay = Math.min(times * 1000, 5000); // макс. 5 сек
    return delay;
  },
};
