import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';
import { CalendarDay } from '@/streak/types/calendar-day.interface';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserDailyActivity)
    private repo: Repository<UserDailyActivity>,

    @InjectRepository(UserStat)
    private readonly userStatRepository: Repository<UserStat>,
    private userService: UserService,
  ) {}

  async getCalendarDays(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarDay[]> {
    const activities = await this.repo.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    const days: CalendarDay[] = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const isoDate = currentDate.toISOString().split('T')[0];
      const activity = activities.find(
        (a) => a.date.toISOString().split('T')[0] === isoDate,
      );

      const hasActivity = activity?.isActive || activity?.isFrozen;
      const streakDay = this.calculateStreakDay(userId, currentDate); // ← см. ниже
      const currencyEarned = activity?.currencyEarned || 0;

      days.push({
        date: isoDate,
        hasActivity: Boolean(hasActivity),
        streakDay: Number(streakDay),
        currencyEarned,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  private async calculateStreakDay(
    userId: number,
    date: Date,
  ): Promise<number> {
    const activities = await this.repo.find({
      where: { userId },
      order: { date: 'ASC' },
    });

    let streak = 0;
    let currentStreak = 0;

    for (const act of activities) {
      const isActive = act.isActive || act.isFrozen;
      const actDate = new Date(act.date);

      if (actDate > date) break; // вышли за пределы нужной даты

      if (isActive) {
        currentStreak++;
        streak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    return streak;
  }

  async getUserStat(userId: number): Promise<UserStat> {
    let userStat = await this.userStatRepository.findOne({
      where: { userId },
      select: [
        'userId',
        'streakDays',
        'maxStreak',
        'currency',
        'freezeTokens',
        'lastActivityDate',
      ],
    });

    if (!userStat) {
      // Создаем запись, если нет
      await this.userStatRepository.insert({
        userId,
        streakDays: 0,
        maxStreak: 0,
        currency: 0,
        freezeTokens: 0,
        lastActivityDate: new Date(),
      });
      userStat = {
        userId,
        streakDays: 0,
        maxStreak: 0,
        currency: 0,
        freezeTokens: 0,
        lastActivityDate: new Date(),
      } as UserStat;
    }

    return userStat;
  }

  /**
   * Покупает заморозку за валюту
   */
  async buyFreezeToken(
    userId: number,
  ): Promise<{ success: boolean; message: string }> {
    const userStat = await this.getUserStat(userId);

    const freezePrice = 100; // цена заморозки

    if (userStat.currency < freezePrice) {
      throw new BadRequestException(
        'Недостаточно валюты для покупки заморозки',
      );
    }

    // Списываем валюту и добавляем заморозку
    await this.userStatRepository.update(
      { userId },
      {
        currency: userStat.currency - freezePrice,
        freezeTokens: userStat.freezeTokens + 1,
      },
    );

    return {
      success: true,
      message: 'Заморозка успешно куплена!',
    };
  }

  /**
   * Использует заморозку для сохранения страйка
   */
  async useFreezeToken(
    userId: number,
    keycloakId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userStat = await this.getUserStat(userId);

    // Убедимся, что freezeTokens — число
    const currentFreezeTokens = Number(userStat.freezeTokens) || 0;

    // Получаем дату последней активности
    const lastActivityDate = new Date(userStat.lastActivityDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Считаем количество пропущенных дней
    const timeDiff = today.getTime() - lastActivityDate.getTime();
    const daysSinceLastActivity = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // Количество дней, которые нужно "заморозить"
    const daysToFreeze = Math.max(0, daysSinceLastActivity);

    if (currentFreezeTokens < daysToFreeze) {
      throw new BadRequestException(
        `Недостаточно заморозок. Пропущено дней: ${daysToFreeze}, доступно: ${currentFreezeTokens}`,
      );
    }

    if (daysToFreeze === 0) {
      return {
        success: true,
        message: 'Нет пропущенных дней для заморозки',
      };
    }

    // Вычисляем новое количество заморозок
    const newFreezeTokens = currentFreezeTokens - daysToFreeze;

    // Списываем нужное количество заморозок
    await this.userStatRepository.update(
      { userId },
      {
        freezeTokens: newFreezeTokens,
        lastActivityDate: today,
      },
    );

    await this.userService.invalidateUserCache(keycloakId);

    return {
      success: true,
      message: `Использовано ${daysToFreeze} замороз${daysToFreeze === 1 ? 'ка' : daysToFreeze < 5 ? 'ки' : 'к'}, страйк сохранен!`,
    };
  }

  /**
   * Сбрасывает страйк пользователя
   */
  async resetStreak(
    userId: number,
    keycloakId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userStat = await this.getUserStat(userId);

    // Обновляем статистику: сброс streak, обновление maxStreak
    const newMaxStreak = Math.max(userStat.streakDays, userStat.maxStreak);

    await this.userStatRepository.update(
      { userId },
      {
        streakDays: 0,
        maxStreak: newMaxStreak,
      },
    );

    await this.userService.invalidateUserCache(keycloakId);

    return {
      success: true,
      message: 'Страйк сброшен',
    };
  }

  /**
   * Проверяет баланс пользователя
   */
  async checkBalance(
    userId: number,
  ): Promise<{ currency: number; freezeTokens: number }> {
    const userStat = await this.getUserStat(userId);
    return {
      currency: userStat.currency,
      freezeTokens: userStat.freezeTokens,
    };
  }
}
