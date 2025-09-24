// notification.service.ts
import { Injectable, Logger } from '@nestjs/common';

import {
  AchievementEarnedEvent,
  StreakUpdateEvent,
} from '@/notification/types';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Хранилище для отслеживания отправленных уведомлений за день
  private dailyNotifications = new Map<string, Set<number>>();

  constructor(private readonly websocketGateway: WebsocketGateway) {}

  /**
   * Отправляет WebSocket событие о достижении страйка
   */
  async sendStreakUpdateEvent(
    userId: number,
    streakDays: number,
    isNewRecord: boolean,
  ): Promise<void> {
    try {
      const event: StreakUpdateEvent = {
        userId,
        streakDays,
        isNewRecord,
      };

      await this.websocketGateway.sendStreakUpdateToUser(userId, event);
      this.logger.log(
        `Streak update sent to user ${userId}: ${streakDays} days${isNewRecord ? ' (NEW RECORD!)' : ''}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send streak update to user ${userId}`,
        error,
      );
    }
  }

  /**
   * Отправляет WebSocket событие о получении достижения
   */
  async sendAchievementEarnedEvent(
    userId: number,
    achievementData: {
      id: number;
      title: string;
      description: string;
      icon: string;
      points: number;
      category: string;
    },
  ): Promise<void> {
    try {
      const event: AchievementEarnedEvent = {
        userId,
        achievement: achievementData,
        earnedAt: new Date(),
      };

      await this.websocketGateway.sendAchievementEarnedToUser(userId, event);
      this.logger.log(
        `Achievement earned sent to user ${userId}: ${achievementData.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send achievement earned to user ${userId}`,
        error,
      );
    }
  }

  /**
   * Отправляет уведомление пользователю о возможности использовать заморозку
   */
  async sendFreezeReminderEvent(
    userId: number,
    freezeTokens: number,
  ): Promise<void> {
    try {
      const event = {
        userId,
        type: 'freeze_reminder',
        message: `Пропустили день? У вас есть ${freezeTokens} замороз${freezeTokens === 1 ? 'ка' : freezeTokens < 5 ? 'ки' : 'к'}. Используйте или купите ещё!`,
        freezeTokens, // ← добавляем количество
        timestamp: new Date(),
      };

      await this.websocketGateway.sendFreezeReminderToUser(userId, event);
      this.logger.log(
        `Freeze reminder sent to user ${userId} with ${freezeTokens} tokens`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send freeze reminder to user ${userId}`,
        error,
      );
    }
  }

  /**
   * Отправляет уведомление пользователю о сбросе страйка
   */
  async sendStreakResetEvent(userId: number): Promise<void> {
    try {
      const event = {
        userId,
        type: 'streak_reset',
        message:
          'Ваш страйк сброшен, так как вы пропустили день без заморозки.',
        timestamp: new Date(),
      };

      await this.websocketGateway.sendStreakResetToUser(userId, event);
      this.logger.log(`Streak reset notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send streak reset to user ${userId}`, error);
    }
  }

  /**
   * Проверяет и отправляет уведомление о возможности использовать заморозку
   */
  async checkAndSendFreezeNotification(
    userId: number,
    freezeTokens: number,
  ): Promise<void> {
    const todayKey = new Date().toISOString().split('T')[0];
    const notificationKey = `freeze_reminder_${todayKey}`;

    if (!this.dailyNotifications.has(notificationKey)) {
      this.dailyNotifications.set(notificationKey, new Set());
    }

    const notifiedUsers = this.dailyNotifications.get(notificationKey)!;

    if (!notifiedUsers.has(userId)) {
      await this.sendFreezeReminderEvent(userId, freezeTokens);
      notifiedUsers.add(userId);

      // Очищаем старые уведомления
      this.cleanupOldNotifications();
    }
  }

  /**
   * Проверяет и отправляет уведомление о сбросе страйка
   */
  async checkAndSendStreakResetNotification(userId: number): Promise<void> {
    const todayKey = new Date().toISOString().split('T')[0];
    const notificationKey = `streak_reset_${todayKey}`;

    if (!this.dailyNotifications.has(notificationKey)) {
      this.dailyNotifications.set(notificationKey, new Set());
    }

    const notifiedUsers = this.dailyNotifications.get(notificationKey)!;

    if (!notifiedUsers.has(userId)) {
      await this.sendStreakResetEvent(userId);
      notifiedUsers.add(userId);

      // Очищаем старые уведомления
      this.cleanupOldNotifications();
    }
  }

  /**
   * Проверяет и отправляет уведомление о страйке, если нужно
   */
  async checkAndSendStreakNotification(
    userId: number,
    streakDays: number,
    maxStreak: number,
  ): Promise<void> {
    // Отправляем уведомление только если это новый рекорд или значимый страйк
    if (streakDays > 1) {
      const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const notificationKey = `streak_${todayKey}`;

      if (!this.dailyNotifications.has(notificationKey)) {
        this.dailyNotifications.set(notificationKey, new Set());
      }

      const notifiedUsers = this.dailyNotifications.get(notificationKey)!;

      // Отправляем уведомление только если это первый раз за день
      if (!notifiedUsers.has(userId)) {
        this.logger.log(`Streak earned sent to user ${userId}`);
        const isNewRecord = streakDays > maxStreak;
        await this.sendStreakUpdateEvent(userId, streakDays, isNewRecord);
        notifiedUsers.add(userId);

        // Очищаем старые уведомления
        this.cleanupOldNotifications();
      }
    }
  }

  /**
   * Проверяет и отправляет уведомление о достижении, если нужно
   */
  async checkAndSendAchievementNotification(
    userId: number,
    achievementData: {
      id: number;
      title: string;
      description: string;
      icon: string;
      points: number;
      category: string;
    },
  ): Promise<void> {
    const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const notificationKey = `achievement_${achievementData.id}_${todayKey}`;

    if (!this.dailyNotifications.has(notificationKey)) {
      this.dailyNotifications.set(notificationKey, new Set());
    }

    const notifiedUsers = this.dailyNotifications.get(notificationKey)!;

    if (!notifiedUsers.has(userId)) {
      await this.sendAchievementEarnedEvent(userId, achievementData);
      notifiedUsers.add(userId);

      // Очищаем старые уведомления
      this.cleanupOldNotifications();
    }
  }

  /**
   * Очищает старые уведомления (старше 2 дней)
   */
  private cleanupOldNotifications(): void {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const cutoffDate = twoDaysAgo.toISOString().split('T')[0];

    for (const key of this.dailyNotifications.keys()) {
      // Проверяем, содержит ли ключ дату и старше ли она 2 дней
      if (key.includes('_') && key.split('_').pop()! < cutoffDate) {
        this.dailyNotifications.delete(key);
      }
    }
  }
}
