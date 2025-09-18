import { Injectable } from '@nestjs/common';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { Achievement } from '@/achievements/entities/achievement.entity';
import { UserService } from '@/modules/user/user.service';
import { Word } from '@/modules/word/entities/word.entity';
import { User } from '@/modules/user/entities/user.entity';
import { UserAchievement } from '@/achievements/entities/user-achievement.entity';
import { UserDailyActivity } from '@/streak/entities/user-daily-activity.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(UserStat)
    private readonly userStatRepository: Repository<UserStat>,
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(UserDailyActivity)
    private readonly userDailyActivityRepository: Repository<UserDailyActivity>,

    private userService: UserService,
  ) {}

  async checkAndAwardAchievementsByKeycloakId(
    keycloakId: string,
  ): Promise<void> {
    const user = await this.userService.findByKeycloakId(keycloakId);

    if (!user) {
      throw new Error(`User with keycloakId "${keycloakId}" not found`);
    }

    await this.checkAndAwardAchievements(user.id);
  }

  async checkAndAwardAchievements(userId: number): Promise<void> {
    const stats = await this.userStatRepository.findOne({ where: { userId } });
    const achievements = await this.achievementRepository.find();

    if (!stats) {
      return;
    }

    for (const ach of achievements) {
      if (await this.isConditionMet(ach.condition, stats, userId)) {
        await this.awardAchievement(userId, ach.id);
      }
    }
  }

  private async isConditionMet(
    condition: Record<string, any>,
    userStat: UserStat,
    userId: number,
  ): Promise<boolean> {
    console.log(
      '[DEBUG] Checking condition:',
      condition,
      'for stats:',
      userStat,
    );

    if (!condition || !condition.type) {
      console.error('[ERROR] Invalid condition:', condition);
      return false;
    }

    const { type, value } = condition;

    switch (type) {
      case 'first_word':
        return userStat.wordsLearned >= 1;
      case 'words_learned':
        return userStat.wordsLearned >= value;
      case 'kana_mastered':
        return userStat.kanaMastered >= value;
      case 'streak_days':
        return userStat.streakDays >= value;
      case 'daily_points':
        return userStat.dailyPoints >= value;
      case 'lesson_completed':
        return userStat.kanaLessonsCompleted >= value;
      case 'lesson_completed_day':
        return await this.checkLessonsCompletedInDay(userId, value);
      default:
        console.warn('[WARN] Unknown condition type:', type);
        return false;
    }
  }

  /**
   * Проверяет, завершил ли пользователь указанное количество уроков за один день
   */
  private async checkLessonsCompletedInDay(
    userId: number,
    requiredLessons: number,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Ищем запись в user_daily_activity, где пользователь завершил НЕ МЕНЕЕ нужного количества уроков за день
    const activity = await this.userDailyActivityRepository.findOne({
      where: {
        userId: userId,
        date: today,
        lessonsCompleted: MoreThanOrEqual(requiredLessons),
      },
    });

    return !!activity;
  }

  /**
   * Проверяет, завершил ли пользователь указанное количество уроков за один день (альтернативный метод)
   */
  private async checkLessonsCompletedInDayAlternative(
    userId: number,
    requiredLessons: number,
  ): Promise<boolean> {
    // Ищем запись в user_daily_activity, где пользователь завершил НЕ МЕНЕЕ нужного количества уроков за день
    const activity = await this.userDailyActivityRepository.findOne({
      where: {
        userId: userId,
        lessonsCompleted: In(
          Array.from(
            { length: 100 - requiredLessons + 1 },
            (_, i) => requiredLessons + i,
          ),
        ),
      },
    });

    return !!activity;
  }

  async awardAchievement(userId: number, achievementId: number): Promise<void> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) return;

    // Получаем пользователя
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) return;

    // Проверяем, не получено ли уже это достижение
    const existingUserAchievement =
      await this.userAchievementRepository.findOne({
        where: {
          user: { id: userId },
          achievement: { id: achievementId },
        },
      });

    if (existingUserAchievement) return;

    // Создаем новую запись UserAchievement
    const userAchievement = new UserAchievement();
    userAchievement.user = user;
    userAchievement.achievement = achievement;
    userAchievement.earnedAt = new Date();

    // Сохраняем UserAchievement
    await this.userAchievementRepository.save(userAchievement);

    // Обновляем статистику пользователя: +очки
    await this.userStatRepository.increment(
      { userId },
      'totalPoints',
      achievement.points,
    );
  }

  async checkWordAudioAchievements(userId: number): Promise<void> {
    const userStat = await this.userStatRepository.findOne({
      where: { userId },
      select: ['wordsLearned'],
    });

    if (!userStat) return;

    // Получаем только достижения, связанные со словами
    const wordRelatedAchievements = await this.achievementRepository.find({
      where: {
        condition: {
          type: In(['words_learned', 'first_word', 'all_n5_words']),
        },
      },
    });

    // Получаем пользователя с достижениями для проверки
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userAchievements', 'userAchievements.achievement'],
    });

    for (const achievement of wordRelatedAchievements) {
      const existing = user?.userAchievements?.some(
        (ach) => ach.achievement.id === achievement.id,
      );

      if (existing) continue;

      const { type, value } = achievement.condition;

      let conditionMet = false;

      switch (type) {
        case 'first_word':
          conditionMet = userStat.wordsLearned >= 1;
          break;
        case 'words_learned':
          conditionMet = userStat.wordsLearned >= value;
          break;
        case 'all_n5_words':
          const totalN5Words = await this.wordRepository.count({
            where: { level: 'N5' },
          });
          conditionMet = userStat.wordsLearned >= totalN5Words;
          break;
        default:
          continue;
      }

      if (conditionMet) {
        await this.awardAchievement(userId, achievement.id);
      }
    }
  }

  async checkKanaAchievements(userId: number): Promise<void> {
    const userStat = await this.userStatRepository.findOne({
      where: { userId },
      select: ['kanaMastered'],
    });

    if (!userStat) return;

    // Только достижения, связанные с кана
    const kanaAchievements = await this.achievementRepository.find({
      where: {
        condition: {
          type: In(['kana_mastered', 'first_kana', 'all_n5_kana']),
        },
      },
    });

    // Получаем пользователя с достижениями для проверки
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userAchievements', 'userAchievements.achievement'],
    });

    for (const achievement of kanaAchievements) {
      const existing = user?.userAchievements?.some(
        (ach) => ach.achievement.id === achievement.id,
      );

      if (existing) continue;

      const { type, value } = achievement.condition;

      let conditionMet = false;

      switch (type) {
        case 'first_kana':
          conditionMet = userStat.kanaMastered >= 1;
          break;
        case 'kana_mastered':
          conditionMet = userStat.kanaMastered >= value;
          break;
        case 'all_n5_kana':
          const totalN5Kana = 46;
          conditionMet = userStat.kanaMastered >= totalN5Kana;
          break;
        default:
          continue;
      }

      if (conditionMet) {
        await this.awardAchievement(userId, achievement.id);
      }
    }
  }

  async checkStreakAchievements(userId: number): Promise<void> {
    const userStat = await this.userStatRepository.findOne({
      where: { userId },
      select: ['streakDays', 'lastActivity'],
    });

    if (!userStat) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActivity = new Date(userStat.lastActivity);

    // Определяем, был ли вход сегодня
    const wasActiveToday =
      lastActivity.getFullYear() === today.getFullYear() &&
      lastActivity.getMonth() === today.getMonth() &&
      lastActivity.getDate() === today.getDate();

    // Если пользователь уже заходил сегодня — ничего не меняем
    if (wasActiveToday) {
      // Просто проверяем достижения
    } else {
      // Если вчера был вход — увеличиваем страйк
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const wasActiveYesterday =
        lastActivity.getFullYear() === yesterday.getFullYear() &&
        lastActivity.getMonth() === yesterday.getMonth() &&
        lastActivity.getDate() === yesterday.getDate();

      if (wasActiveYesterday) {
        userStat.streakDays += 1;
      } else {
        userStat.streakDays = 1;
      }

      await this.userStatRepository.save(userStat);
    }

    // Теперь проверяем достижения по страйку
    const streakAchievements = await this.achievementRepository.find({
      where: {
        condition: {
          type: 'streak_days',
        },
      },
    });

    // Получаем пользователя с достижениями для проверки
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userAchievements', 'userAchievements.achievement'],
    });

    for (const achievement of streakAchievements) {
      const existing = user?.userAchievements?.some(
        (ach) => ach.achievement.id === achievement.id,
      );

      if (existing) continue;

      const { value } = achievement.condition;

      if (userStat.streakDays >= value) {
        await this.awardAchievement(userId, achievement.id);
      }
    }
  }

  /**
   * Проверяет достижения, связанные с завершением уроков за день
   */
  async checkLessonDayAchievements(userId: number): Promise<void> {
    // Получаем достижения, которые оканчиваются на _day или имеют тип lesson_completed_day
    const lessonDayAchievements = await this.achievementRepository.find({
      where: {
        condition: {
          type: 'lesson_completed_day',
        },
      },
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userAchievements', 'userAchievements.achievement'],
    });

    for (const achievement of lessonDayAchievements) {
      const existing = user?.userAchievements?.some(
        (ach) => ach.achievement.id === achievement.id,
      );

      if (existing) continue;

      const { value } = achievement.condition;

      // Проверяем, завершил ли пользователь нужное количество уроков за один день
      const conditionMet = await this.checkLessonsCompletedInDay(userId, value);

      if (conditionMet) {
        await this.awardAchievement(userId, achievement.id);
      }
    }
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
