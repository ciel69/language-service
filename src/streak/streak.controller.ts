import { Controller, Get, Param } from '@nestjs/common';
import { StreakService } from '@/streak/streak.service';

@Controller('streak')
export class StreakController {
  constructor(private streakService: StreakService) {}

  @Get(':userId/current')
  async getCurrent(@Param('userId') userId: number) {
    const userStat = await this.streakService.getUserStat(userId);
    return {
      currentStreak: userStat.streakDays,
      maxStreak: userStat.maxStreak,
    };
  }

  @Get(':userId/calendar')
  async getCalendar(@Param('userId') userId: number) {
    const today = new Date();
    const startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000); // год назад
    return this.streakService.getCalendarDays(userId, startDate, today);
  }
}
