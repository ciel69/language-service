import { Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { UserStat } from '@/achievements/entities/user-stat.entity';
import { Achievement } from '@/achievements/entities/achievement.entity';
import { UserService } from '@/modules/user/user.service';
import { Word } from '@/modules/word/entities/word.entity';
import { User } from '@/modules/user/entities/user.entity';

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
      if (await this.isConditionMet(ach.condition, stats)) {
        await this.awardAchievement(userId, ach.id);
      }
    }
  }

  private async isConditionMet(
    condition: Record<string, any>,
    userStat: UserStat,
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
      default:
        console.warn('[WARN] Unknown condition type:', type);
        return false;
    }
  }

  async awardAchievement(userId: number, achievementId: number): Promise<void> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) return;

    // Получаем пользователя с его достижениями
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['achievements'],
    });

    if (!user) return;

    // Проверяем, не получено ли уже это достижение
    const alreadyHasAchievement = user.achievements?.some(
      (ach) => ach.id === achievementId,
    );
    if (alreadyHasAchievement) return;

    // Добавляем достижение пользователю (через связь)
    const achievementToAdd = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievementToAdd) return; // Добавляем проверку на null

    if (!user.achievements) {
      user.achievements = [];
    }

    user.achievements.push(achievementToAdd);

    // Обновляем статистику пользователя: +очки
    await this.userStatRepository.increment(
      { userId },
      'totalPoints',
      achievement.points,
    );

    // Сохраняем пользователя с новым достижением
    await this.userRepository.save(user);

    // 🔔 Опционально: отправить уведомление через WebSocket или Push
    // this.notificationService.sendAchievementAwarded(userId, achievement.title);
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
      relations: ['achievements'],
    });

    for (const achievement of wordRelatedAchievements) {
      const existing = user?.achievements?.some(
        (ach) => ach.id === achievement.id,
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
      relations: ['achievements'],
    });

    for (const achievement of kanaAchievements) {
      const existing = user?.achievements?.some(
        (ach) => ach.id === achievement.id,
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
      relations: ['achievements'],
    });

    for (const achievement of streakAchievements) {
      const existing = user?.achievements?.some(
        (ach) => ach.id === achievement.id,
      );

      if (existing) continue;

      const { value } = achievement.condition;

      if (userStat.streakDays >= value) {
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
