import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';
import { CalendarDay } from '@/streak/types/calendar-day.interface';
import { UserStat } from '@/achievements/entities/user-stat.entity';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserDailyActivity)
    private repo: Repository<UserDailyActivity>,

    @InjectRepository(UserStat)
    private readonly userStatRepository: Repository<UserStat>,
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
    const userStat = await this.userStatRepository.findOne({
      where: { userId },
      select: ['streakDays', 'maxStreak'],
    });

    if (!userStat) {
      throw new Error(`UserStat not found for user ${userId}`);
    }

    return userStat;
  }
}
