import { Queue, JobsOptions } from 'bullmq';
import { redisOptions } from '@/config/redis';

// 👇 Тип данных для всех задач в очереди
export interface AchievementJobData {
  userId: number;
}

// 👇 Очередь — одна на всё
export const achievementCheckQueue = new Queue('achievement-check', {
  connection: redisOptions,
});

// 👇 Обёртка для проверки достижений пользователя
export function checkAchievementsForUser(userId: number, opts?: JobsOptions) {
  return achievementCheckQueue.add(
    'check-achievements-for-user', // 👈 ЛОГИЧЕСКИЙ ТИП ЗАДАЧИ
    { userId },
    opts,
  );
}

// 👇 Обёртка для других типов (например, после изучения слова)
export function addWordAudioJob(userId: number, opts?: JobsOptions) {
  return achievementCheckQueue.add('word-audio', { userId }, opts);
}

export function addKanaRecognitionJob(userId: number, opts?: JobsOptions) {
  return achievementCheckQueue.add('kana-recognition', { userId }, opts);
}
