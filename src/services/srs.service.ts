// src/srs/srs.service.ts
import { Injectable } from '@nestjs/common';

/**
 * Интерфейс элемента SRS системы
 */
export interface SrsItem {
  id: number;
  type: 'kana' | 'kanji' | 'word' | 'grammar';
}

/**
 * Стадии изучения элемента в SRS
 */
export type SrsStage =
  | 'new'
  | 'learning'
  | 'review'
  | 'review_2'
  | 'review_3'
  | 'mastered';

/**
 * Прогресс изучения элемента SRS
 */
export interface SrsProgress {
  id: number;
  itemId: number;
  itemType: 'kana' | 'kanji' | 'word' | 'grammar';
  userId: number;

  progress: number;
  correctAttempts: number;
  incorrectAttempts: number;
  perceivedDifficulty: number;
  stage: SrsStage;

  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
  reviewCount: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Элемент учебного плана
 */
export interface LessonPlanItem {
  item: SrsItem;
  progress: SrsProgress | null;
}

/**
 * Результат выполнения упражнения SRS
 */
export class SrsExerciseResultDto {
  itemId: number;
  itemType: 'kana' | 'kanji' | 'word' | 'grammar';
  isCorrect: boolean;
  responseTimeMs?: number;
}

/**
 * Базовые интервалы повторения в миллисекундах
 */
const SRS_BASE_INTERVALS_MS = {
  learning: 4 * 60 * 60 * 1000, // 4 часа
  review_1: 24 * 60 * 60 * 1000, // 1 день
  review_2: 3 * 24 * 60 * 60 * 1000, // 3 дня
  review_3: 7 * 24 * 60 * 60 * 1000, // 7 дней
  mastered: 30 * 24 * 60 * 60 * 1000, // 30 дней
} as const;

/**
 * Множители сложности для корректировки интервалов
 */
const DIFFICULTY_MULTIPLIERS = [1.5, 1.3, 1.0, 0.7] as const;

/**
 * Максимальный прирост прогресса за одну сессию
 */
const MAX_PROGRESS_INCREMENT_PER_SESSION = 8;

@Injectable()
export class SrsService {
  /**
   * Рассчитывает новый прогресс и стадию на основе результата упражнения
   */
  calculateProgressChange(
    isCorrect: boolean,
    currentProgress: number,
    currentStage: SrsStage,
    perceivedDifficulty: number,
  ): { newProgress: number; newStage: SrsStage } {
    let newProgress = currentProgress;
    let newStage = currentStage;

    // Нормализуем воспринимаемую сложность до диапазона 0-1 (0 = легко, 1 = сложно)
    const normalizedDifficulty = Math.max(
      0,
      Math.min(1, (perceivedDifficulty - 1) / 3),
    );

    if (isCorrect) {
      newProgress = this.calculateProgressForCorrectAnswer(
        currentProgress,
        currentStage,
        normalizedDifficulty,
      );
      newStage = this.calculateStageForCorrectAnswer(
        currentProgress,
        currentStage,
        newProgress,
      );
    } else {
      newProgress = this.calculateProgressForIncorrectAnswer(
        currentProgress,
        currentStage,
        normalizedDifficulty,
      );
      newStage = this.calculateStageForIncorrectAnswer(
        currentProgress,
        currentStage,
        newProgress,
      );
    }

    return { newProgress, newStage };
  }

  /**
   * Рассчитывает следующий интервал повторения на основе стадии и сложности
   */
  calculateNextInterval(stage: SrsStage, perceivedDifficulty: number): number {
    const baseMs = this.getBaseIntervalMs(stage);
    const difficultyIndex = Math.max(0, Math.min(3, perceivedDifficulty - 1));
    const multiplier = DIFFICULTY_MULTIPLIERS[difficultyIndex];

    return baseMs * multiplier;
  }

  /**
   * Проверяет, нужно ли повторить элемент на основе даты последнего обновления и интервала
   */
  isDueForReview(nextReviewAt: Date | null): boolean {
    if (!nextReviewAt) {
      return true; // Новые элементы всегда доступны
    }

    return new Date() >= nextReviewAt;
  }

  /**
   * Проверяет, был ли элемент уже изучен сегодня
   */
  wasReviewedToday(lastReviewedAt: Date | null): boolean {
    if (!lastReviewedAt) {
      return false;
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const lastReviewDate = new Date(
      lastReviewedAt.getFullYear(),
      lastReviewedAt.getMonth(),
      lastReviewedAt.getDate(),
    );

    return lastReviewDate.getTime() === todayStart.getTime();
  }

  /**
   * Определяет, нужно ли включать элемент в текущую сессию SRS
   */
  shouldBeIncludedInSession(progress: SrsProgress | null): boolean {
    // Новые элементы всегда включаются
    if (!progress) {
      return true;
    }

    // Элементы с 2+ ошибками всегда включаются
    if (progress.incorrectAttempts >= 2) {
      return true;
    }

    // Элементы с 1 ошибкой в текущей сессии тоже включаются
    if (
      progress.incorrectAttempts >= 1 &&
      this.wasReviewedToday(progress.lastReviewedAt)
    ) {
      return true;
    }

    // Элементы с прогрессом 100% и не просроченные не включаются
    if (
      progress.progress === 100 &&
      !this.isDueForReview(progress.nextReviewAt)
    ) {
      return false;
    }

    // Если элемент уже изучался сегодня и имеет прогресс > 30% и нет ошибок, не включаем его
    if (
      this.wasReviewedToday(progress.lastReviewedAt) &&
      progress.progress > 30
    ) {
      return false;
    }

    // Если элемент просрочен или новый - включаем
    return this.isDueForReview(progress.nextReviewAt) || progress.progress < 30;
  }

  /**
   * Сортирует элементы для SRS-сессии с оптимальным балансом новых и повторяемых элементов
   */
  sortItemsForSession(
    itemsWithProgress: LessonPlanItem[],
    maxSymbols: number = 5,
  ): LessonPlanItem[] {
    // Фильтруем элементы, которые должны быть включены в сессию
    const filteredItems = itemsWithProgress.filter(({ progress }) =>
      this.shouldBeIncludedInSession(progress),
    );

    // Разделить на новые и повторяемые
    const [newItems, reviewItems] = filteredItems.reduce(
      (acc, item) => {
        if (!item.progress || item.progress.progress === 0) {
          acc[0].push(item);
        } else {
          acc[1].push(item);
        }
        return acc;
      },
      [[], []] as [LessonPlanItem[], LessonPlanItem[]],
    );

    // Сортируем каждую группу по своим правилам
    const sortedNewItems = this.sortNewItems(newItems);
    const sortedReviewItems = this.sortItemsForSessionByPriority(reviewItems);

    // Проверяем просроченные элементы
    const overdueReviewItems = sortedReviewItems.filter(
      ({ progress }) => progress && this.isDueForReview(progress.nextReviewAt),
    );

    const result: LessonPlanItem[] = [];

    // Если просроченных достаточно, выделяем под них больше места
    const minOverdueCount = Math.min(3, Math.ceil(maxSymbols / 2));
    if (overdueReviewItems.length >= minOverdueCount) {
      // Берём до половины новых, остальное — просроченные
      const newCount = Math.max(0, Math.floor(maxSymbols / 2));
      const overdueCount = Math.min(
        maxSymbols - newCount,
        overdueReviewItems.length,
      );

      result.push(...sortedNewItems.slice(0, newCount));
      result.push(...overdueReviewItems.slice(0, overdueCount));
    } else {
      // Иначе балансируем между новыми и повторами
      const reviewCount = Math.min(
        Math.floor(maxSymbols / 2),
        sortedReviewItems.length,
      );
      const newCount = Math.min(
        maxSymbols - reviewCount,
        sortedNewItems.length,
      );

      result.push(...sortedNewItems.slice(0, newCount));
      result.push(...sortedReviewItems.slice(0, reviewCount));
    }

    return result.slice(0, maxSymbols);
  }

  // === PRIVATE METHODS ===

  /**
   * Рассчитывает новый прогресс для правильного ответа
   */
  private calculateProgressForCorrectAnswer(
    currentProgress: number,
    currentStage: SrsStage,
    normalizedDifficulty: number,
  ): number {
    let increment = 0;

    switch (currentStage) {
      case 'new':
        increment = Math.min(
          3 + (1 - normalizedDifficulty) * 2,
          MAX_PROGRESS_INCREMENT_PER_SESSION,
        );
        break;
      case 'learning':
        increment = Math.min(
          2 + (1 - normalizedDifficulty) * 1,
          MAX_PROGRESS_INCREMENT_PER_SESSION,
        );
        break;
      case 'review':
      case 'review_2':
      case 'review_3':
        increment = Math.min(
          1 + (1 - normalizedDifficulty) * 1,
          MAX_PROGRESS_INCREMENT_PER_SESSION,
        );
        break;
      case 'mastered':
        increment = Math.min(
          0.5 + (1 - normalizedDifficulty) * 0.5,
          MAX_PROGRESS_INCREMENT_PER_SESSION,
        );
        break;
      default:
        increment = Math.min(2, MAX_PROGRESS_INCREMENT_PER_SESSION);
    }

    return Math.min(100, currentProgress + increment);
  }

  /**
   * Рассчитывает новую стадию для правильного ответа
   */
  private calculateStageForCorrectAnswer(
    currentProgress: number,
    currentStage: SrsStage,
    newProgress: number,
  ): SrsStage {
    let newStage = currentStage;

    switch (currentStage) {
      case 'new':
        newStage = 'learning';
        break;
      case 'learning':
        if (newProgress >= 60) newStage = 'review';
        break;
      case 'review':
      case 'review_2':
      case 'review_3':
        if (newProgress >= 100) newStage = 'mastered';
        break;
    }

    // Корректировка стадии на основе нового прогресса
    if (newProgress === 100 && currentStage !== 'mastered') {
      newStage = 'mastered';
    } else if (
      newProgress >= 60 &&
      ['new', 'learning'].includes(currentStage)
    ) {
      newStage = 'review';
    }

    return newStage;
  }

  /**
   * Рассчитывает новый прогресс для неправильного ответа
   */
  private calculateProgressForIncorrectAnswer(
    currentProgress: number,
    currentStage: SrsStage,
    normalizedDifficulty: number,
  ): number {
    let decrement = 0;

    switch (currentStage) {
      case 'new':
        decrement = 2 + normalizedDifficulty * 2; // От 2 (легкий) до 4 (сложный)
        break;
      case 'learning':
        decrement = 3 + normalizedDifficulty * 2; // От 3 (легкий) до 5 (сложный)
        break;
      case 'review':
      case 'review_2':
      case 'review_3':
        decrement = 5 + normalizedDifficulty * 3; // От 5 (легкий) до 8 (сложный)
        break;
      case 'mastered':
        decrement = 8 + normalizedDifficulty * 5; // От 8 (легкий) до 13 (сложный)
        break;
      default:
        decrement = 3;
    }

    return Math.max(0, currentProgress - decrement);
  }

  /**
   * Рассчитывает новую стадию для неправильного ответа
   */
  private calculateStageForIncorrectAnswer(
    currentProgress: number,
    currentStage: SrsStage,
    newProgress: number,
  ): SrsStage {
    let newStage = currentStage;

    switch (currentStage) {
      case 'learning':
        if (newProgress < 20) newStage = 'new';
        break;
      case 'review':
      case 'review_2':
      case 'review_3':
        newStage = 'learning'; // Сброс на стадию изучения
        break;
      case 'mastered':
        newStage = 'review'; // Сильный сброс
        break;
    }

    return newStage;
  }

  /**
   * Получает базовый интервал в миллисекундах для заданной стадии
   */
  private getBaseIntervalMs(stage: SrsStage): number {
    switch (stage) {
      case 'new':
      case 'learning':
        return SRS_BASE_INTERVALS_MS.learning;
      case 'review':
        return SRS_BASE_INTERVALS_MS.review_1;
      case 'review_2':
        return SRS_BASE_INTERVALS_MS.review_2;
      case 'review_3':
        return SRS_BASE_INTERVALS_MS.review_3;
      case 'mastered':
        return SRS_BASE_INTERVALS_MS.mastered;
      default:
        return SRS_BASE_INTERVALS_MS.learning;
    }
  }

  /**
   * Вспомогательный метод для сортировки повторяемых элементов по приоритету
   */
  private sortItemsForSessionByPriority(
    items: LessonPlanItem[],
  ): LessonPlanItem[] {
    // Разделяем на группы
    const groups = items.reduce(
      (acc, item) => {
        const { progress } = item;

        if (!progress) {
          acc.regular.push(item);
          return acc;
        }

        if (progress.incorrectAttempts >= 2) {
          acc.multipleErrors.push(item);
        } else if (
          progress.incorrectAttempts >= 1 &&
          this.wasReviewedToday(progress.lastReviewedAt)
        ) {
          acc.singleError.push(item);
        } else if (this.isDueForReview(progress.nextReviewAt)) {
          acc.overdue.push(item);
        } else {
          acc.regular.push(item);
        }

        return acc;
      },
      {
        multipleErrors: [] as LessonPlanItem[],
        singleError: [] as LessonPlanItem[],
        overdue: [] as LessonPlanItem[],
        regular: [] as LessonPlanItem[],
      },
    );

    // Сортируем каждую группу
    const sortedMultipleErrors = this.sortItemsWithMultipleErrors(
      groups.multipleErrors,
    );
    const sortedSingleError = this.sortItemsWithSingleError(groups.singleError);
    const sortedOverdue = this.sortOverdueItems(groups.overdue);
    const sortedRegular = this.sortReviewItems(groups.regular);

    // Комбинируем в порядке приоритета
    return [
      ...sortedMultipleErrors,
      ...sortedSingleError,
      ...sortedOverdue,
      ...sortedRegular,
    ];
  }

  /**
   * Сортирует новые элементы по приоритету
   */
  private sortNewItems(items: LessonPlanItem[]): LessonPlanItem[] {
    return [...items].sort((a, b) => a.item.id - b.item.id);
  }

  /**
   * Сортирует просроченные элементы по срочности
   */
  private sortOverdueItems(items: LessonPlanItem[]): LessonPlanItem[] {
    return [...items].sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      if (progressA && progressB) {
        // Сортируем по просрочке (более просроченные первыми)
        const now = Date.now();
        const overdueA = progressA.nextReviewAt
          ? Math.max(0, now - progressA.nextReviewAt.getTime())
          : 0;
        const overdueB = progressB.nextReviewAt
          ? Math.max(0, now - progressB.nextReviewAt.getTime())
          : 0;

        if (overdueA !== overdueB) {
          return overdueB - overdueA;
        }

        // При равной просрочке - по прогрессу (меньший прогресс - выше приоритет)
        if (progressA.progress !== progressB.progress) {
          return progressA.progress - progressB.progress;
        }
      }

      return a.item.id - b.item.id;
    });
  }

  /**
   * Сортирует элементы с 2+ ошибками по приоритету
   */
  private sortItemsWithMultipleErrors(
    items: LessonPlanItem[],
  ): LessonPlanItem[] {
    return [...items].sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      if (progressA && progressB) {
        // Приоритет по количеству ошибок (больше ошибок - выше приоритет)
        if (progressA.incorrectAttempts !== progressB.incorrectAttempts) {
          return progressB.incorrectAttempts - progressA.incorrectAttempts;
        }

        // При равном количестве ошибок - по прогрессу (меньше - выше)
        if (progressA.progress !== progressB.progress) {
          return progressA.progress - progressB.progress;
        }
      }

      return a.item.id - b.item.id;
    });
  }

  /**
   * Сортирует элементы с 1 ошибкой по приоритету
   */
  private sortItemsWithSingleError(items: LessonPlanItem[]): LessonPlanItem[] {
    return [...items].sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      if (progressA && progressB) {
        // Приоритет по прогрессу (меньше - выше)
        if (progressA.progress !== progressB.progress) {
          return progressA.progress - progressB.progress;
        }
      }

      return a.item.id - b.item.id;
    });
  }

  /**
   * Сортирует элементы к повторению по срочности
   */
  private sortReviewItems(items: LessonPlanItem[]): LessonPlanItem[] {
    return [...items].sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      if (progressA && progressB) {
        // Сортируем по срочности
        const urgencyA = this.calculateUrgency(progressA);
        const urgencyB = this.calculateUrgency(progressB);

        if (urgencyA !== urgencyB) {
          return urgencyB - urgencyA;
        }

        // При равной срочности - по прогрессу (меньший прогресс - выше приоритет)
        if (progressA.progress !== progressB.progress) {
          return progressA.progress - progressB.progress;
        }
      }

      return a.item.id - b.item.id;
    });
  }

  /**
   * Рассчитывает "срочность" повторения элемента
   */
  private calculateUrgency(progress: SrsProgress | null): number {
    if (!progress) {
      return 100; // Новые элементы самые срочные
    }

    const now = Date.now();
    const nextReviewAt = progress.nextReviewAt?.getTime() ?? now;
    const progressValue = progress.progress;

    // Если просрочено, увеличиваем срочность
    const overdueHours = Math.max(0, (now - nextReviewAt) / (1000 * 60 * 60));

    // Чем меньше прогресс, тем срочнее
    const progressFactor = 100 - progressValue;

    // Срочность рассчитывается как комбинация просрочки и прогресса
    const urgency = overdueHours * 2 + progressFactor * 0.5;

    return Math.max(0, urgency);
  }
}
