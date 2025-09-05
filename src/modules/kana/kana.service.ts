import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreateKanaDto } from './dto/create-kana.dto';
import { UpdateKanaDto } from './dto/update-kana.dto';
import { Kana } from '@/modules/kana/entities/kana.entity';
import { KanaProgress } from '@/modules/progress/entities/kana-progress.entity';
import {
  SrsExerciseResultDto,
  SrsItem,
  SrsProgress,
  SrsService,
} from '@/services/srs.service';
import { User } from '@/modules/user/entities/user.entity';

export interface KanaLessonSymbol {
  id: number; // ID символа Kana
  char: string; // Сам символ, например, 'あ'
  romaji: string; // Ромадзи, например, 'a'
  progress: number; // Текущий прогресс пользователя (0-100)
  progressId: number | null; // ID записи KanaProgress, если есть
  // Можно добавить другие поля, если нужно (например, примеры)
}

export interface KanaLessonPlan {
  symbols: KanaLessonSymbol[];
  message?: string; // Сообщение, если урок пустой или особый случай
}

@Injectable()
export class KanaService {
  private readonly logger = new Logger(KanaService.name);

  constructor(
    @InjectRepository(Kana)
    private readonly kanaRepository: Repository<Kana>,
    @InjectRepository(KanaProgress)
    private readonly kanaProgressRepository: Repository<KanaProgress>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly srsService: SrsService, // <-- Внедрение SrsService
  ) {}

  /**
   * Получает список символов каны для следующего урока пользователя.
   * Использует SrsService для фильтрации и сортировки символов.
   * @param userId ID пользователя.
   * @param type Тип каны ('hiragana' | 'katakana'). По умолчанию 'hiragana'.
   * @param maxSymbols Максимальное количество символов в уроке (по умолчанию 10).
   * @returns Promise<KanaLessonPlan> Список символов для урока.
   */
  async getLessonPlan(
    userId: number,
    type: 'hiragana' | 'katakana' = 'hiragana',
    maxSymbols: number = 5,
  ): Promise<KanaLessonPlan> {
    this.logger.log(
      `Получение плана урока для пользователя ID ${userId}, тип ${type}, макс. символов ${maxSymbols} (SRS)`,
    );

    // 1. Проверка существования пользователя
    const userExists = await this.userRepository.exist({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден.`);
    }

    // 2. Получить все символы нужного типа, отсортированные по ID (порядку)
    const allKana = await this.kanaRepository.find({
      where: { type },
      order: { id: 'ASC' }, // Сортировка по ID = порядок в таблице
      // select: ['id', 'char', 'romaji'], // Опционально: ограничить поля
    });

    if (allKana.length === 0) {
      this.logger.warn(`Не найдено символов типа ${type}.`);
      return { symbols: [], message: `Нет доступных символов типа ${type}.` };
    }

    const allKanaIds = allKana.map((k) => k.id);
    const kanaMap = new Map(allKana.map((k) => [k.id, k])); // Для быстрого поиска

    // 3. Получить прогресс пользователя по этим символам
    const progressList = await this.kanaProgressRepository.find({
      where: {
        userId,
        kanaId: In(allKanaIds),
      },
    });

    // 4. Создать карту прогресса kanaId -> KanaProgress для быстрого поиска
    const progressMap = new Map<number, KanaProgress>();
    progressList.forEach((p) => {
      progressMap.set(p.kanaId, p);
    });

    // 5. Подготовить данные для SRS-сервиса
    // Создаем список объектов SrsItem и соответствующих SrsProgress
    const srsItemsWithProgress: {
      item: SrsItem;
      progress: SrsProgress | null;
    }[] = allKana.map((kana) => {
      const kanaProgress = progressMap.get(kana.id);

      const srsItem: SrsItem = {
        id: kana.id,
        type: 'kana',
        // content: kana.char // Опционально
      };

      let srsProgress: SrsProgress | null = null;
      if (kanaProgress) {
        srsProgress = {
          id: kanaProgress.id,
          itemId: kanaProgress.kanaId,
          itemType: 'kana',
          userId: kanaProgress.userId,
          progress: kanaProgress.progress,
          correctAttempts: kanaProgress.correctAttempts,
          incorrectAttempts: kanaProgress.incorrectAttempts,
          perceivedDifficulty: kanaProgress.perceivedDifficulty,
          stage: kanaProgress.stage,
          nextReviewAt: kanaProgress.nextReviewAt,
          lastReviewedAt: kanaProgress.updatedAt, // Предполагаем, что updatedAt - это последний обзор
          reviewCount: 0, // Предположим, что это поле не используется или будет рассчитано
          createdAt: kanaProgress.createdAt,
          updatedAt: kanaProgress.updatedAt,
        };
      }

      return { item: srsItem, progress: srsProgress };
    });

    // 6. Используем SrsService для фильтрации и сортировки
    // a. Фильтруем: оставляем только те, которые нужно включить в сессию
    const filteredItems = srsItemsWithProgress.filter(({ item, progress }) =>
      this.srsService.shouldBeIncludedInSession(progress),
    );

    // b. Сортируем по приоритету SRS
    const sortedItems = this.srsService.sortItemsForSession(filteredItems);

    // 7. Преобразуем отсортированные SrsItem обратно в KanaLessonSymbol
    const lessonSymbols: KanaLessonSymbol[] = sortedItems
      .slice(0, maxSymbols)
      .map(({ item, progress }) => {
        const kana = kanaMap.get(item.id);
        if (!kana) {
          // Это маловероятно, но на всякий случай
          this.logger.warn(
            `Kana с ID ${item.id} не найдена при формировании урока.`,
          );
          return null; // Или выбросить ошибку
        }
        return {
          id: kana.id,
          char: kana.char,
          romaji: kana.romaji,
          progress: progress?.progress ?? 0,
          progressId: progress?.id ?? null,
        };
      })
      .filter((symbol): symbol is KanaLessonSymbol => symbol !== null); // Убираем null

    this.logger.log(
      `Сформирован план урока (SRS): ${lessonSymbols.length} символов.`,
    );

    if (lessonSymbols.length === 0) {
      return {
        symbols: [],
        message: 'Нет символов для изучения или повторения на данный момент.',
      };
    }

    return { symbols: lessonSymbols };
  }

  create(createKanaDto: CreateKanaDto) {
    return 'This action adds a new kana';
  }

  findAll() {
    return `This action returns all kana`;
  }

  async findSymbols(type: 'hiragana' | 'katakana', userId: number) {
    // Важно: используем queryBuilder для левого соединения
    return await this.kanaRepository
      .createQueryBuilder('kana')
      .leftJoinAndSelect(
        'kana.progress', // название связи в сущности Kana
        'progress', // алиас для joined таблицы progress
        'progress.userId = :userId', // условие для JOIN (ищем только прогресс текущего юзера)
        { userId }, // параметр для подстановки
      )
      .where('kana.type = :type', { type })
      .getMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} kana`;
  }

  update(id: number, updateKanaDto: UpdateKanaDto) {
    return `This action updates a #${id} kana`;
  }

  remove(id: number) {
    return `This action removes a #${id} kana`;
  }

  /**
   * Обновляет прогресс пользователя по кана на основе результата упражнения
   */
  async updateProgress(
    userId: number,
    result: SrsExerciseResultDto,
  ): Promise<KanaProgress> {
    // Находим существующий прогресс или создаем новый
    let progress = await this.kanaProgressRepository.findOne({
      where: {
        userId,
        kanaId: result.itemId,
      },
    });

    if (!progress) {
      // Создаем новый прогресс для символа кана
      progress = this.kanaProgressRepository.create({
        userId,
        kanaId: result.itemId,
        progress: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        perceivedDifficulty: 2,
        stage: 'new',
        nextReviewAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<KanaProgress>);
    }

    // Обновляем прогресс на основе результата
    progress = this.applySrsLogic(progress, result);

    // Сохраняем обновленный прогресс
    return this.kanaProgressRepository.save(progress);
  }

  /**
   * Применяет SRS логику к прогрессу кана
   */
  private applySrsLogic(
    progress: KanaProgress,
    result: SrsExerciseResultDto,
  ): KanaProgress {
    // Используем методы SRS сервиса для расчетов
    const { newProgress, newStage } = this.srsService.calculateProgressChange(
      result.isCorrect,
      progress.progress,
      progress.stage,
      progress.perceivedDifficulty,
    );

    // Обновляем поля существующей сущности
    progress.progress = Math.round(newProgress); // Округляем до целого числа
    progress.stage = newStage as 'new' | 'learning' | 'review' | 'mastered';
    progress.correctAttempts = result.isCorrect
      ? progress.correctAttempts + 1
      : progress.correctAttempts;
    progress.incorrectAttempts = result.isCorrect
      ? progress.incorrectAttempts
      : progress.incorrectAttempts + 1;
    progress.updatedAt = new Date();

    // Расчет nextReviewAt
    const intervalMs = this.srsService.calculateNextInterval(
      newStage,
      progress.perceivedDifficulty,
    );
    progress.nextReviewAt = new Date(Date.now() + intervalMs);

    // Обновление perceivedDifficulty (должно быть целым числом 1-4)
    const totalAttempts = progress.correctAttempts + progress.incorrectAttempts;
    if (totalAttempts > 3) {
      const accuracy = progress.correctAttempts / totalAttempts;
      if (accuracy < 0.5) {
        progress.perceivedDifficulty = 4; // сложно
      } else if (accuracy < 0.8) {
        progress.perceivedDifficulty = 3; // нормально
      } else {
        progress.perceivedDifficulty = 2; // легко
      }
    }

    return progress;
  }
}
