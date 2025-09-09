import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreateKanjiDto } from './dto/create-kanji.dto';
import { UpdateKanjiDto } from './dto/update-kanji.dto';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';
import { KanjiPack } from '@/modules/kanji/entities/kanji-pack.entity';
import {
  KanjiDetailDto,
  KanjiWithProgressDto,
  WordDto,
} from '@/modules/kanji/dto';
import { KanjiLessonSymbol } from '@/modules/kanji/interfaces';
import {
  SrsExerciseResultDto,
  SrsItem,
  SrsProgress,
  SrsService,
} from '@/services/srs.service';
import { KanjiProgress } from '@/modules/progress/entities/kanji-progress.entity';
import { User } from '@/modules/user/entities/user.entity';
import { KanjiPackProgressService } from '@/modules/kanji/kanji-pack-progress.service';

@Injectable()
export class KanjiService {
  private readonly logger = new Logger(KanjiService.name);

  constructor(
    @InjectRepository(Kanji)
    private readonly kanjiRepository: Repository<Kanji>,
    @InjectRepository(KanjiPack)
    private readonly kanjiPackRepository: Repository<KanjiPack>,
    @InjectRepository(KanjiPackProgress)
    private readonly kanjiPackProgressRepository: Repository<KanjiPackProgress>,
    @InjectRepository(KanjiProgress)
    private readonly kanjiProgressRepository: Repository<KanjiProgress>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly srsService: SrsService,
    private readonly kanjiPackProgressService: KanjiPackProgressService,
  ) {}

  create(createKanjiDto: CreateKanjiDto) {
    return 'This action adds a new kanji';
  }

  findAll() {
    return `This action returns all kanji`;
  }

  findOne(id: number) {
    return `This action returns a #${id} kanji`;
  }

  update(id: number, updateKanjiDto: UpdateKanjiDto) {
    return `This action updates a #${id} kanji`;
  }

  remove(id: number) {
    return `This action removes a #${id} kanji`;
  }

  // Получить все кандзи в паке с прогрессом пользователя
  async getKanjiByPackIdWithProgress(
    packId: number,
    userId: number,
  ): Promise<KanjiWithProgressDto[]> {
    // Проверяем существование пака
    const pack = await this.kanjiPackRepository.findOne({
      where: { id: packId },
    });

    if (!pack) {
      throw new NotFoundException(`KanjiPack with ID ${packId} not found`);
    }

    // Получаем кандзи с прогрессом через LEFT JOIN
    const kanjiWithProgress = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .leftJoinAndSelect(
        'kanji.progress',
        'progress',
        'progress.userId = :userId',
        { userId },
      )
      .where('kanji.pack_id = :packId', { packId })
      .orderBy('kanji.id', 'ASC')
      .getMany();

    return this.mapKanjiToDto(kanjiWithProgress);
  }

  // Получить случайные кандзи из пака с прогрессом пользователя
  async getRandomKanjiFromPackWithProgress(
    packId: number,
    userId: number,
    limit: number,
  ): Promise<KanjiWithProgressDto[]> {
    const pack = await this.kanjiPackRepository.findOne({
      where: { id: packId },
    });

    if (!pack) {
      throw new NotFoundException(`KanjiPack with ID ${packId} not found`);
    }

    // Сначала получаем все ID кандзи в паке
    const kanjiIds = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .select('kanji.id')
      .where('kanji.pack_id = :packId', { packId })
      .getRawMany();

    if (kanjiIds.length === 0) {
      return [];
    }

    // Перемешиваем и берем нужное количество
    const shuffledIds = kanjiIds
      .map((row) => row.kanji_id)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, kanjiIds.length));

    // Получаем кандзи с прогрессом
    const kanjiWithProgress = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .leftJoinAndSelect(
        'kanji.progress',
        'progress',
        'progress.userId = :userId',
        { userId },
      )
      .where('kanji.id IN (:...ids)', { ids: shuffledIds })
      .getMany();

    return this.mapKanjiToDto(kanjiWithProgress);
  }

  // Вспомогательный метод для маппинга в DTO
  private mapKanjiToDto(kanjiList: Kanji[]): KanjiWithProgressDto[] {
    return kanjiList.map((kanji) => {
      // Парсим массивы из строки, если они приходят как строки
      const parseArray = (value: string | string[] | undefined): string[] => {
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          // Убираем фигурные скобки и разбиваем по запятым
          return value
            .replace(/^\{|\}$/g, '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
        return [];
      };

      return {
        id: kanji.id,
        char: kanji.char,
        on: parseArray(kanji.on),
        kun: parseArray(kanji.kun),
        meaning: kanji.meaning,
        level: kanji.level,
        progress:
          kanji.progress && kanji.progress.length > 0
            ? {
                id: kanji.progress[0].id,
                progress: kanji.progress[0].progress,
                correctAttempts: kanji.progress[0].correctAttempts,
                incorrectAttempts: kanji.progress[0].incorrectAttempts,
                perceivedDifficulty: kanji.progress[0].perceivedDifficulty,
                nextReviewAt: kanji.progress[0].nextReviewAt,
                stage: kanji.progress[0].stage,
                createdAt: kanji.progress[0].createdAt,
                updatedAt: kanji.progress[0].updatedAt,
              }
            : null, // Всегда возвращаем null, если нет прогресса
      };
    });
  }

  async getPacksWithProgress(level: string, userId: number) {
    const packs = await this.kanjiPackRepository
      .createQueryBuilder('pack')
      .select([
        'pack.id',
        'pack.title',
        'pack.description',
        'pack.order',
        'COUNT(kanji.id) as totalCount',
      ])
      .leftJoin('pack.kanji', 'kanji')
      .where('pack.level = :level', { level })
      .groupBy('pack.id')
      .orderBy('pack.order', 'ASC')
      .getRawMany();

    const packIds = packs.map((p) => p.pack_id);

    // Получаем прогресс из таблицы прогресса паков
    const progressList = await this.kanjiPackProgressRepository
      .createQueryBuilder('progress')
      .select([
        'progress.packId',
        'progress.learnedCount',
        'progress.totalCount',
        'progress.progress',
      ])
      .where('progress.packId IN (:...packIds)', { packIds })
      .andWhere('progress.userId = :userId', { userId })
      .getRawMany();

    // Создаем мап прогресса для быстрого поиска
    const progressMap: Record<number, any> = {};
    progressList.forEach((row) => {
      progressMap[row.progress_packId] = {
        learnedCount: parseInt(row.progress_learnedCount, 10),
        totalCount: parseInt(row.progress_totalCount, 10),
        progress: parseInt(row.progress_progress, 10),
      };
    });

    return packs.map((p) => {
      const packProgress = progressMap[p.pack_id];
      const total = parseInt(p.totalCount, 10);

      if (packProgress) {
        // Используем реальный прогресс из базы
        return {
          id: p.pack_id,
          title: p.pack_title,
          description: p.pack_description,
          order: p.pack_order,
          totalKanji: packProgress.totalCount,
          learnedKanji: packProgress.learnedCount,
          progressPercent: packProgress.progress, // <-- Используем сохраненный прогресс
        };
      } else {
        // Нет прогресса - возвращаем 0
        return {
          id: p.pack_id,
          title: p.pack_title,
          description: p.pack_description,
          order: p.pack_order,
          totalKanji: total,
          learnedKanji: 0,
          progressPercent: 0,
        };
      }
    });
  }

  async getKanjiDetail(
    id: number,
    userId?: number,
  ): Promise<KanjiDetailDto | null> {
    // Получаем кандзи с прогрессом и словами
    const kanji = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .leftJoinAndSelect('kanji.words', 'words')
      .leftJoinAndSelect(
        'kanji.progress',
        'progress',
        'progress.userId = :userId',
        { userId },
      )
      .where('kanji.id = :id', { id })
      .getOne();

    if (!kanji) {
      return null;
    }

    // Парсим массивы
    const parseArray = (value: string | string[] | undefined): string[] => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return value
          .replace(/^\{|\}$/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    };

    // Маппим слова в DTO
    const wordsDto: WordDto[] = kanji.words.map((word) => ({
      id: word.id,
      word: word.word,
      kana: word.kana,
      romaji: word.romaji,
      meaning: word.meaning,
      category: word.category,
      level: word.level,
    }));

    return {
      id: kanji.id,
      char: kanji.char,
      on: parseArray(kanji.on),
      kun: parseArray(kanji.kun),
      meaning: kanji.meaning,
      level: kanji.level,
      progress:
        kanji.progress && kanji.progress.length > 0
          ? {
              id: kanji.progress[0].id,
              progress: kanji.progress[0].progress,
              correctAttempts: kanji.progress[0].correctAttempts,
              incorrectAttempts: kanji.progress[0].incorrectAttempts,
              perceivedDifficulty: kanji.progress[0].perceivedDifficulty,
              nextReviewAt: kanji.progress[0].nextReviewAt,
              stage: kanji.progress[0].stage,
              createdAt: kanji.progress[0].createdAt,
              updatedAt: kanji.progress[0].updatedAt,
            }
          : null,
      words: wordsDto,
    };
  }

  /**
   * Обновляет прогресс пользователя по кандзи на основе результата упражнения
   * (без автоматического обновления пака для повышения производительности)
   */
  async updateProgress(
    userId: number,
    result: SrsExerciseResultDto,
  ): Promise<any> {
    // Находим существующий прогресс или создаем новый
    let progress = await this.kanjiProgressRepository.findOne({
      where: {
        userId,
        kanjiId: result.itemId,
      },
    });

    if (!progress) {
      // Создаем новый прогресс для кандзи
      progress = this.kanjiProgressRepository.create({
        userId,
        kanjiId: result.itemId,
        progress: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        perceivedDifficulty: 2,
        stage: 'new',
        nextReviewAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Обновляем прогресс на основе результата
    const updatedProgress = this.applySrsLogic(progress, result);

    // Сохраняем обновленный прогресс
    const savedProgress =
      await this.kanjiProgressRepository.save(updatedProgress);

    return savedProgress;
  }

  /**
   * Обновляет прогресс пака кандзи
   */
  async updatePackProgress(userId: number, packId: number): Promise<void> {
    try {
      await this.kanjiPackProgressService.updatePackProgress(userId, packId);
    } catch (error) {
      console.warn(
        `Не удалось обновить прогресс пака ${packId} для пользователя ${userId}:`,
        error,
      );
    }
  }

  /**
   * Применяет логику SRS для обновления прогресса
   */
  private applySrsLogic(progress: any, result: SrsExerciseResultDto): any {
    // Рассчитываем новый прогресс и стадию с помощью SRS сервиса
    const { newProgress, newStage } = this.srsService.calculateProgressChange(
      result.isCorrect,
      progress.progress,
      progress.stage,
      progress.perceivedDifficulty,
    );

    // Обновляем статистику
    if (result.isCorrect) {
      progress.correctAttempts += 1;
    } else {
      progress.incorrectAttempts += 1;
    }

    // Обновляем воспринимаемую сложность на основе времени ответа
    if (result.responseTimeMs) {
      const timeBasedDifficulty = this.calculateDifficultyFromTime(
        result.responseTimeMs,
      );
      // Усредняем с текущей сложностью
      progress.perceivedDifficulty = Math.round(
        (progress.perceivedDifficulty + timeBasedDifficulty) / 2,
      );
    }

    // Обновляем прогресс и стадию (округляем до целого числа!)
    progress.progress = Math.round(newProgress); // <-- ОКРУГЛЯЕМ ДО ЦЕЛОГО
    progress.stage = newStage as any;

    // Рассчитываем следующее время повторения
    const nextInterval = this.srsService.calculateNextInterval(
      newStage as any,
      progress.perceivedDifficulty,
    );

    progress.nextReviewAt =
      nextInterval > 0 ? new Date(Date.now() + nextInterval) : null;

    // Обновляем дату последнего изменения
    progress.updatedAt = new Date();

    return progress;
  }

  /**
   * Рассчитывает сложность на основе времени ответа
   */
  private calculateDifficultyFromTime(responseTimeMs: number): number {
    if (responseTimeMs < 2000) return 1; // легко
    if (responseTimeMs < 5000) return 2; // средне
    if (responseTimeMs < 10000) return 3; // сложно
    return 4; // очень сложно
  }

  /**
   * Получает список кандзи для следующего урока пользователя.
   * Использует SrsService для фильтрации и сортировки символов.
   * @param userId ID пользователя.
   * @param packId ID пака кандзи.
   * @param maxSymbols Максимальное количество символов в уроке (по умолчанию 5).
   * @returns Promise<KanjiLessonPlan> Список символов для урока.
   */
  async getLessonPlan(
    userId: number,
    packId: number,
    maxSymbols: number = 5,
  ): Promise<{
    symbolsToLearn: KanjiLessonSymbol[];
    learnedSymbols: KanjiLessonSymbol[];
    srsProgressMap: Record<number, any>;
  }> {
    this.logger.log(
      `Получение плана урока для пользователя ID ${userId}, пак ${packId}, макс. символов ${maxSymbols} (SRS)`,
    );

    // 1. Проверка существования пользователя и пака
    const userExists = await this.userRepository.exist({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден.`);
    }

    const packExists = await this.kanjiPackRepository.exist({
      where: { id: packId },
    });
    if (!packExists) {
      throw new NotFoundException(`Пак кандзи с ID ${packId} не найден.`);
    }

    // 2. Получить все кандзи из пака, отсортированные по ID
    const allKanji = await this.kanjiRepository.find({
      where: { pack: { id: packId } },
      order: { id: 'ASC' },
    });

    if (allKanji.length === 0) {
      this.logger.warn(`Не найдено кандзи в паке ${packId}.`);
      return {
        symbolsToLearn: [],
        learnedSymbols: [],
        srsProgressMap: {},
      };
    }

    const allKanjiIds = allKanji.map((k) => k.id);
    const kanjiMap = new Map(allKanji.map((k) => [k.id, k]));

    // 3. Получить прогресс пользователя по этим кандзи
    const progressList = await this.kanjiProgressRepository.find({
      where: {
        userId,
        kanjiId: In(allKanjiIds),
      },
    });

    // 4. Создать карту прогресса kanjiId -> KanjiProgress
    const progressMap = new Map<number, KanjiProgress>();
    progressList.forEach((p) => {
      progressMap.set(p.kanjiId, p);
    });

    // 5. Подготовить данные для SRS-сервиса
    const srsItemsWithProgress: {
      item: SrsItem;
      progress: SrsProgress | null;
    }[] = allKanji.map((kanji) => {
      const kanjiProgress = progressMap.get(kanji.id);

      const srsItem: SrsItem = {
        id: kanji.id,
        type: 'kanji',
      };

      let srsProgress: SrsProgress | null = null;
      if (kanjiProgress) {
        srsProgress = {
          id: kanjiProgress.id,
          itemId: kanjiProgress.kanjiId,
          itemType: 'kanji',
          userId: kanjiProgress.userId,
          progress: kanjiProgress.progress,
          correctAttempts: kanjiProgress.correctAttempts,
          incorrectAttempts: kanjiProgress.incorrectAttempts,
          perceivedDifficulty: kanjiProgress.perceivedDifficulty,
          stage: kanjiProgress.stage,
          nextReviewAt: kanjiProgress.nextReviewAt,
          lastReviewedAt: kanjiProgress.updatedAt,
          reviewCount: 0,
          createdAt: kanjiProgress.createdAt,
          updatedAt: kanjiProgress.updatedAt,
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

    // 7. Преобразуем отсортированные SrsItem обратно в KanjiLessonSymbol
    const lessonSymbols: KanjiLessonSymbol[] = [];

    for (const { item, progress } of sortedItems.slice(0, maxSymbols)) {
      const kanji = kanjiMap.get(item.id);
      if (kanji) {
        lessonSymbols.push({
          id: kanji.id,
          char: kanji.char,
          on: kanji.on,
          kun: kanji.kun,
          meaning: kanji.meaning,
          level: kanji.level,
          progress: progress?.progress ?? 0,
          progressId: progress?.id,
        });
      } else {
        this.logger.warn(
          `Kanji с ID ${item.id} не найден при формировании урока.`,
        );
      }
    }

    this.logger.log(
      `Сформирован план урока (SRS): ${lessonSymbols.length} кандзи.`,
    );

    // Разделяем на новые и изученные символы
    const symbolsToLearn = lessonSymbols.filter(
      (symbol) => (symbol.progress || 0) < 10,
    );
    const learnedSymbols = lessonSymbols.filter(
      (symbol) => (symbol.progress || 0) >= 10,
    );

    // Создаем мап прогресса для генератора уроков
    const srsProgressMap: Record<number, any> = {};
    sortedItems.forEach(({ item, progress }) => {
      if (progress) {
        srsProgressMap[item.id] = progress;
      }
    });

    return { symbolsToLearn, learnedSymbols, srsProgressMap };
  }
}
