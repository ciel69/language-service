// streak.controller.ts
import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { StreakService } from '@/streak/streak.service';
import { Request } from 'express';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';

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

  /**
   * Покупка заморозки
   */
  @Post(':userId/buy-freeze')
  async buyFreeze(@Param('userId') userId: number) {
    return await this.streakService.buyFreezeToken(userId);
  }

  /**
   * Сброс страйка
   */
  @Post(':userId/reset')
  async resetStreak(@Param('userId') userId: number, @Req() req: Request) {
    const user = req.user as KeycloakJwtPayload;
    return await this.streakService.resetStreak(userId, user.sub);
  }

  /**
   * Проверка баланса
   */
  @Get(':userId/balance')
  async getBalance(@Param('userId') userId: number) {
    return await this.streakService.checkBalance(userId);
  }

  /**
   * Использование заморозки
   */
  @Post(':userId/use-freeze')
  async useFreeze(@Param('userId') userId: number, @Req() req: Request) {
    const user = req.user as KeycloakJwtPayload;
    return await this.streakService.useFreezeToken(userId, user.sub);
  }
}
