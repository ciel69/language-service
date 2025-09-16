import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';
import { achievementCheckQueue } from '@/achievements/queues/achievement-check.queue';

@Injectable()
export class CurrencyAndStreakService {
  private readonly logger = new Logger(CurrencyAndStreakService.name);

  constructor(
    @InjectRepository(UserStat)
    private userStatRepo: Repository<UserStat>,

    @InjectRepository(UserDailyActivity)
    private dailyActivityRepo: Repository<UserDailyActivity>,
  ) {}

  /**
   * Отмечает день как активный (или замороженный) после прохождения урока.
   * Вызывается из KanaController, WordController и других.
   *
   * @param userId ID пользователя
   * @param rewardAmount Количество валюты, начисленной за урок
   * @param isFrozen Флаг: был ли этот день "спасён" заморозкой (даже если не было урока)
   */
  async markDayAsActive(
    userId: number,
    rewardAmount: number,
    isFrozen: boolean = false,
  ): Promise<void> {
    if (rewardAmount < 0) {
      this.logger.warn(
        `Attempted to award negative currency (${rewardAmount}) to user ${userId}`,
      );
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Начисляем валюту (если есть)
    if (rewardAmount > 0) {
      await this.userStatRepo.increment({ userId }, 'currency', rewardAmount);

      this.logger.log(`Awarded ${rewardAmount} currency to user ${userId}`);
    }

    // 2. Получаем или создаём запись о сегодняшнем дне
    let activity = await this.dailyActivityRepo.findOne({
      where: { userId, date: today },
    });

    if (!activity) {
      // Первый раз в этот день — создаём
      activity = this.dailyActivityRepo.create({
        userId,
        date: today,
        isActive: true,
        isFrozen,
        currencyEarned: rewardAmount,
        lessonsCompleted: 1,
      });
    } else {
      // Уже был — обновляем
      activity.isActive = true; // Даже если wasFrozen — теперь активен
      if (isFrozen) activity.isFrozen = true; // Если передана заморозка — сохраняем
      activity.currencyEarned += rewardAmount;
      activity.lessonsCompleted += 1;
    }

    await this.dailyActivityRepo.save(activity);

    // 3. Пересчитываем страйк и maxStreak на основе всех дней
    await this.updateStreakStats(userId);
  }

  /**
   * Применяет заморозку к конкретному дню (например, пропущенному).
   * Используется при покупке заморозки и применении её к прошлому дню.
   *
   * @param userId ID пользователя
   * @param date Дата, которую нужно заморозить (в формате YYYY-MM-DD)
   */
  async applyFreezeToDay(userId: number, date: Date): Promise<boolean> {
    const isoDate = date.toISOString().split('T')[0];
    const dateObj = new Date(isoDate);

    // Проверяем, есть ли запись за этот день
    const activity = await this.dailyActivityRepo.findOne({
      where: { userId, date: dateObj },
    });

    if (!activity) {
      // Создаём запись, если её не было — например, пользователь пропустил день и не проходил урок
      await this.dailyActivityRepo.save({
        userId,
        date: isoDate,
        isActive: false,
        isFrozen: true,
        currencyEarned: 0,
        lessonsCompleted: 0,
      });
    } else {
      // Обновляем существующую запись
      if (!activity.isFrozen) {
        activity.isFrozen = true;
        await this.dailyActivityRepo.save(activity);
      }
    }

    // Пересчитываем страйк
    await this.updateStreakStats(userId);
    return true;
  }

  /**
   * Использует одну заморозку (списывает из баланса).
   * Вызывается при покупке или применении заморозки.
   */
  async useFreezeToken(userId: number): Promise<boolean> {
    const userStat = await this.userStatRepo.findOne({
      where: { userId },
      select: ['freezeTokens'],
    });

    if (!userStat || userStat.freezeTokens <= 0) {
      return false;
    }

    await this.userStatRepo.decrement({ userId }, 'freezeTokens', 1);
    this.logger.log(
      `User ${userId} used 1 freeze token. Remaining: ${userStat.freezeTokens - 1}`,
    );
    return true;
  }

  /**
   * Покупает одну заморозку за указанную стоимость.
   * Возвращает false, если недостаточно валюты.
   */
  async buyFreezeToken(userId: number, cost: number = 100): Promise<boolean> {
    const success = await this.deductCurrency(userId, cost);
    if (!success) return false;

    await this.userStatRepo.increment({ userId }, 'freezeTokens', 1);
    this.logger.log(
      `User ${userId} bought 1 freeze token for ${cost} currency`,
    );
    return true;
  }

  /**
   * Списывает указанное количество валюты с баланса пользователя.
   * Возвращает false, если средств недостаточно.
   */
  async deductCurrency(userId: number, amount: number): Promise<boolean> {
    if (amount < 0) {
      this.logger.warn(
        `Attempted to deduct negative currency (${amount}) from user ${userId}`,
      );
      return false;
    }

    if (amount === 0) return true;

    const userStat = await this.userStatRepo.findOne({
      where: { userId },
      select: ['currency'],
    });

    if (!userStat || userStat.currency < amount) {
      this.logger.warn(
        `Insufficient currency for user ${userId}: need ${amount}, have ${userStat?.currency || 0}`,
      );
      return false;
    }

    await this.userStatRepo.decrement({ userId }, 'currency', amount);
    this.logger.log(
      `Deducted ${amount} currency from user ${userId}. New balance: ${userStat.currency - amount}`,
    );
    return true;
  }

  /**
   * Получает текущий баланс валюты пользователя.
   */
  async getBalance(userId: number): Promise<number> {
    const userStat = await this.userStatRepo.findOne({
      where: { userId },
      select: ['currency'],
    });
    return userStat?.currency || 0;
  }

  /**
   * Получает количество доступных заморозок у пользователя.
   */
  async getFreezeTokens(userId: number): Promise<number> {
    const userStat = await this.userStatRepo.findOne({
      where: { userId },
      select: ['freezeTokens'],
    });
    return userStat?.freezeTokens || 0;
  }

  /**
   * Пересчитывает текущий и максимальный страйк пользователя
   * на основе всех записей в user_daily_activity.
   * Учитывает как активные, так и замороженные дни.
   */
  private async updateStreakStats(userId: number): Promise<void> {
    const activities = await this.dailyActivityRepo.find({
      where: { userId },
      order: { date: 'ASC' },
    });

    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate: Date | null = null;

    for (const act of activities) {
      const actDate = new Date(act.date);

      // День считается активным, если:
      // - пользователь прошёл урок (isActive), ИЛИ
      // - использовал заморозку (isFrozen)
      const isActiveToday = act.isActive || act.isFrozen;

      if (isActiveToday) {
        if (!lastDate) {
          // Первый день
          currentStreak = 1;
        } else {
          const diff = this.daysBetween(lastDate, actDate);
          if (diff === 1) {
            // Следующий день подряд
            currentStreak++;
          } else {
            // Пропущен день — страйк сломан
            currentStreak = 1;
          }
        }
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        // Неактивный день — страйк сброшен
        currentStreak = 0;
      }

      lastDate = actDate;
    }

    // Сохраняем в user_stat
    await this.userStatRepo.update(
      { userId },
      {
        streakDays: currentStreak,
        maxStreak,
        lastActivityDate: lastDate || new Date(),
        lastActivity: lastDate
          ? new Date(lastDate.getTime() + 24 * 60 * 60 * 1000)
          : new Date(),
      },
    );
  }

  /**
   * Отмечает завершение урока по кана.
   * Вызывается после успешного выполнения урока.
   * Увеличивает счётчик kanaLessonsCompleted и проверяет достижения.
   *
   * @param userId ID пользователя
   * @param rewardAmount Валюта, начисленная за урок
   */
  async markKanaLessonCompleted(
    userId: number,
    rewardAmount: number,
  ): Promise<void> {
    if (rewardAmount < 0) {
      this.logger.warn(
        `Attempted to award negative currency (${rewardAmount}) to user ${userId}`,
      );
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Начисляем валюту
    if (rewardAmount > 0) {
      await this.userStatRepo.increment({ userId }, 'currency', rewardAmount);

      this.logger.log(`Awarded ${rewardAmount} currency to user ${userId}`);
    }

    // 2. Увеличиваем счётчик уроков по кана
    await this.userStatRepo.increment({ userId }, 'kanaLessonsCompleted', 1);

    // 3. Получаем обновлённое значение
    const updatedUserStat = await this.userStatRepo.findOne({
      where: { userId },
      select: ['kanaLessonsCompleted'], // Только нужное поле
    });

    if (!updatedUserStat) {
      throw new Error(`UserStat not found for user ${userId}`);
    }

    this.logger.log(
      `Incremented kana lessons for user ${userId}. Total: ${updatedUserStat.kanaLessonsCompleted}`,
    );

    // 4. Обновляем страйк (как раньше)
    await this.markDayAsActive(userId, rewardAmount, false); // 👈 вызываем существующий метод

    await achievementCheckQueue.add(
      'check-achievements-for-user',
      {
        userId,
      },
      {
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
      },
    );
  }

  /**
   * Вычисляет количество дней между двумя датами
   */
  private daysBetween(date1: Date, date2: Date): number {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }
}
