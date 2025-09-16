import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { Achievement } from '@/achievements/entities/achievement.entity';
import { UserAchievement } from '@/achievements/entities/user-achievement.entity';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(UserStat)
    private readonly userStatRepository: Repository<UserStat>,
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,

    private userService: UserService,
  ) {}

  async checkAndAwardAchievementsByKeycloakId(
    keycloakId: string,
  ): Promise<void> {
    // 👇 ВСЁ СЕЙЧАС ПО KEYCLOAK ID!
    const user = await this.userService.findByKeycloakId(keycloakId);

    if (!user) {
      throw new Error(`User with keycloakId "${keycloakId}" not found`);
    }

    await this.checkAndAwardAchievements(user.id); // Передаём внутренний id, но источник — keycloakId
  }

  async checkAndAwardAchievements(userId: number): Promise<void> {
    const stats = await this.userStatRepository.findOne({ where: { userId } });
    const achievements = await this.achievementRepository.find();
    if (!stats) {
      return;
    }
    for (const ach of achievements) {
      if (await this.isConditionMet(ach.condition, stats)) {
        await this.awardAchievement(userId, ach.id);
      }
    }
  }

  private async isConditionMet(
    condition: Record<string, any>,
    stats: UserStat,
  ): Promise<boolean> {
    switch (condition.type) {
      case 'lesson_completed':
        return stats.lessonsCompleted >= condition.value;
      case 'words_learned':
        return stats.wordsLearned >= condition.value;
      case 'streak_days':
        return stats.streakDays >= condition.value;
      case 'daily_points':
        return stats.dailyPoints >= condition.value;
      default:
        return false;
    }
  }

  async awardAchievement(userId: number, achievementId: number): Promise<void> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) return;

    // Проверяем, не получено ли уже
    const existing = await this.userAchievementRepository.findOne({
      where: { userId, achievementId },
    });

    if (existing && existing.isAchieved) return;

    const userAchievement = new UserAchievement();
    userAchievement.userId = userId;
    userAchievement.achievementId = achievementId;
    userAchievement.achievedAt = new Date();
    userAchievement.progress = 0; // для мгновенных — 0
    userAchievement.isAchieved = true;
    userAchievement.metadata = { awardedAt: new Date().toISOString() };

    // Обновляем статистику пользователя: +очки
    await this.userStatRepository.increment(
      { userId },
      'totalPoints',
      achievement.points,
    );

    await this.userAchievementRepository.save(userAchievement);

    // 🔔 Опционально: отправить уведомление через WebSocket или Push
    // this.notificationService.sendAchievementAwarded(userId, achievement.title);
  }

  create(createAchievementDto: CreateAchievementDto) {
    return 'This action adds a new achievement';
  }

  findAll() {
    return `This action returns all achievements`;
  }

  findOne(id: number) {
    return `This action returns a #${id} achievement`;
  }

  update(id: number, updateAchievementDto: UpdateAchievementDto) {
    return `This action updates a #${id} achievement`;
  }

  remove(id: number) {
    return `This action removes a #${id} achievement`;
  }
}
