// src/srs/srs.service.ts
import { Injectable } from '@nestjs/common';

export interface SrsItem {
  id: number;
  type: 'kana' | 'kanji' | 'word' | 'grammar';
}

export type SrsStage =
  | 'new'
  | 'learning'
  | 'review'
  | 'review_2'
  | 'review_3'
  | 'mastered';

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

export interface LessonPlanItem {
  item: SrsItem;
  progress: SrsProgress | null;
}

export class SrsExerciseResultDto {
  itemId: number;
  itemType: 'kana' | 'kanji' | 'word' | 'grammar';
  isCorrect: boolean;
  responseTimeMs?: number;
}

const SRS_BASE_INTERVALS_MS = {
  learning: 4 * 60 * 60 * 1000,
  review_1: 24 * 60 * 60 * 1000,
  review_2: 3 * 24 * 60 * 60 * 1000,
  review_3: 7 * 24 * 60 * 60 * 1000,
  mastered: 30 * 24 * 60 * 60 * 1000,
};

const DIFFICULTY_MULTIPLIERS = [1.5, 1.3, 1.0, 0.7];

// Уменьшаем максимальный прогресс за сессию
const MAX_PROGRESS_INCREMENT_PER_SESSION = 8;

@Injectable()
export class SrsService {
  /**
   * Рассчитывает новый прогресс и стадию на основе результата упражнения.
   * @param isCorrect Был ли ответ правильным?
   * @param currentProgress Текущий прогресс (0-100).
   * @param currentStage Текущая стадия.
   * @param perceivedDifficulty Воспринимаемая сложность (1-4).
   * @returns Объект с новым прогрессом и стадией.
   */
  calculateProgressChange(
    isCorrect: boolean,
    currentProgress: number,
    currentStage: SrsStage,
    perceivedDifficulty: number,
  ): { newProgress: number; newStage: SrsStage } {
    let newProgress = currentProgress;
    let newStage = currentStage;

    // Нормализуем perceivedDifficulty до диапазона 0-1 (0 = легко, 1 = сложно)
    const normalizedDifficulty = Math.max(
      0,
      Math.min(1, (perceivedDifficulty - 1) / 3),
    );

    if (isCorrect) {
      // --- Логика для правильного ответа (уменьшенный прирост) ---
      let increment = 0;
      switch (currentStage) {
        case 'new':
          increment = Math.min(
            3 + (1 - normalizedDifficulty) * 2,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          newStage = 'learning';
          break;
        case 'learning':
          increment = Math.min(
            2 + (1 - normalizedDifficulty) * 1,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          if (newProgress + increment >= 60) newStage = 'review';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          increment = Math.min(
            1 + (1 - normalizedDifficulty) * 1,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          if (newProgress + increment >= 100) {
            newProgress = 100;
            newStage = 'mastered';
          }
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
      newProgress = Math.min(100, currentProgress + increment);
    } else {
      // --- Логика для неправильного ответа ---
      let decrement = 0;
      switch (currentStage) {
        case 'new':
          decrement = 2 + normalizedDifficulty * 2; // От 2 (легкий) до 4 (сложный)
          break;
        case 'learning':
          decrement = 3 + normalizedDifficulty * 2; // От 3 (легкий) до 5 (сложный)
          if (newProgress - decrement < 20) newStage = 'new';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          decrement = 5 + normalizedDifficulty * 3; // От 5 (легкий) до 8 (сложный)
          newStage = 'learning'; // Сброс на стадию изучения
          break;
        case 'mastered':
          decrement = 8 + normalizedDifficulty * 5; // От 8 (легкий) до 13 (сложный)
          newStage = 'review'; // Сильный сброс
          break;
        default:
          decrement = 3;
      }
      newProgress = Math.max(0, currentProgress - decrement);
    }

    // --- Корректировка стадии на основе нового прогресса ---
    if (newStage === currentStage) {
      if (newProgress === 100 && currentStage !== 'mastered') {
        newStage = 'mastered';
      } else if (
        newProgress >= 60 &&
        ['new', 'learning'].includes(currentStage)
      ) {
        newStage = 'review';
      } else if (newProgress < 20 && currentStage === 'learning') {
        newStage = 'new';
      }
    }

    return { newProgress, newStage };
  }

  /**
   * Рассчитывает следующий интервал повторения на основе стадии и сложности.
   */
  calculateNextInterval(stage: SrsStage, perceivedDifficulty: number): number {
    let baseMs = SRS_BASE_INTERVALS_MS.learning;
    switch (stage) {
      case 'new':
      case 'learning':
        baseMs = SRS_BASE_INTERVALS_MS.learning;
        break;
      case 'review':
        baseMs = SRS_BASE_INTERVALS_MS.review_1;
        break;
      case 'review_2':
        baseMs = SRS_BASE_INTERVALS_MS.review_2;
        break;
      case 'review_3':
        baseMs = SRS_BASE_INTERVALS_MS.review_3;
        break;
      case 'mastered':
        baseMs = SRS_BASE_INTERVALS_MS.mastered;
        break;
      default:
        baseMs = SRS_BASE_INTERVALS_MS.learning;
    }
    const difficultyIndex = Math.max(0, Math.min(3, perceivedDifficulty - 1));
    const multiplier = DIFFICULTY_MULTIPLIERS[difficultyIndex];
    return baseMs * multiplier;
  }

  /**
   * Проверяет, нужно ли повторить элемент на основе даты последнего обновления и интервала.
   */
  isDueForReview(nextReviewAt: Date | null): boolean {
    if (!nextReviewAt) {
      return true; // Новые элементы всегда доступны
    }
    const now = new Date();
    return now >= nextReviewAt;
  }

  /**
   * Проверяет, был ли элемент уже изучен сегодня
   */
  wasReviewedToday(lastReviewedAt: Date | null): boolean {
    if (!lastReviewedAt) {
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastReviewDate = new Date(
      lastReviewedAt.getFullYear(),
      lastReviewedAt.getMonth(),
      lastReviewedAt.getDate(),
    );

    return lastReviewDate.getTime() === today.getTime();
  }

  /**
   * Проверяет, были ли ошибки с элементом в последней сессии
   * Теперь элементы с 2 и более ошибками всегда включаются в следующую сессию
   */
  hadErrorsInLastSession(progress: SrsProgress | null): boolean {
    if (!progress) {
      return false;
    }

    // Элементы с 2 и более ошибками всегда включаются в следующую сессию
    return progress.incorrectAttempts >= 2;
  }

  /**
   * Проверяет, были ли ошибки с элементом в текущей сессии
   * Для элементов с 1 ошибкой в текущей сессии
   */
  hadRecentError(progress: SrsProgress | null): boolean {
    if (!progress) {
      return false;
    }

    // Элементы с 1 ошибкой в текущей сессии также включаются
    return (
      progress.incorrectAttempts >= 1 &&
      this.wasReviewedToday(progress.lastReviewedAt)
    );
  }

  /**
   * Определяет, нужно ли включать элемент в текущую сессию SRS.
   */
  shouldBeIncludedInSession(progress: SrsProgress | null): boolean {
    // Новые элементы всегда включаются
    if (!progress) {
      return true;
    }

    // Элементы с 2+ ошибками всегда включаются
    if (this.hadErrorsInLastSession(progress)) {
      return true;
    }

    // Элементы с 1 ошибкой в текущей сессии тоже включаются
    if (this.hadRecentError(progress)) {
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
    const newItems: LessonPlanItem[] = [];
    const reviewItems: LessonPlanItem[] = [];

    filteredItems.forEach((item) => {
      const { progress } = item;
      if (!progress || progress.progress === 0) {
        newItems.push(item);
      } else {
        reviewItems.push(item);
      }
    });

    // Сортируем каждую группу по своим правилам
    const sortedNewItems = this.sortNewItems(newItems);
    const sortedReviewItems = this.sortItemsForSessionByPriority(reviewItems);

    // Проверяем просроченные элементы
    const overdueReviewItems = sortedReviewItems.filter(
      ({ progress }) => progress && this.isDueForReview(progress.nextReviewAt),
    );

    // Формируем финальный список с нужным балансом
    const result: LessonPlanItem[] = [];

    if (overdueReviewItems.length >= 3) {
      // 2 новых + 3 просроченных
      result.push(...sortedNewItems.slice(0, 2));
      result.push(...overdueReviewItems.slice(0, 3));
    } else {
      // 3 новых + 2 повторения (или сколько есть)
      const newCount = Math.min(3, sortedNewItems.length);
      const reviewCount = Math.min(
        maxSymbols - newCount,
        sortedReviewItems.length,
      );

      result.push(...sortedNewItems.slice(0, newCount));
      result.push(...sortedReviewItems.slice(0, reviewCount));
    }

    return result.slice(0, maxSymbols);
  }

  /**
   * Вспомогательный метод для сортировки повторяемых элементов по приоритету
   */
  private sortItemsForSessionByPriority(
    items: LessonPlanItem[],
  ): LessonPlanItem[] {
    // Разделяем на группы
    const overdueItems: LessonPlanItem[] = [];
    const itemsWithMultipleErrors: LessonPlanItem[] = [];
    const itemsWithSingleError: LessonPlanItem[] = [];
    const regularReviewItems: LessonPlanItem[] = [];

    items.forEach((item) => {
      const { progress } = item;

      if (!progress) {
        regularReviewItems.push(item);
        return;
      }

      if (this.hadErrorsInLastSession(progress)) {
        itemsWithMultipleErrors.push(item);
        return;
      }

      if (this.hadRecentError(progress)) {
        itemsWithSingleError.push(item);
        return;
      }

      if (this.isDueForReview(progress.nextReviewAt)) {
        overdueItems.push(item);
        return;
      }

      regularReviewItems.push(item);
    });

    // Сортируем каждую группу
    const sortedOverdue = this.sortOverdueItems(overdueItems);
    const sortedMultipleErrors = this.sortItemsWithMultipleErrors(
      itemsWithMultipleErrors,
    );
    const sortedSingleError =
      this.sortItemsWithSingleError(itemsWithSingleError);
    const sortedRegular = this.sortReviewItems(regularReviewItems);

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
  private sortNewItems(
    items: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return items.sort((a, b) => {
      // Новые элементы сортируем по ID (более старые первыми)
      return a.item.id - b.item.id;
    });
  }

  /**
   * Сортирует просроченные элементы по срочности
   */
  private sortOverdueItems(
    items: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return items.sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      if (progressA && progressB) {
        // Сортируем по просрочке (более просроченные первыми)
        const now = new Date().getTime();
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
    items: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return items.sort((a, b) => {
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
  private sortItemsWithSingleError(
    items: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return items.sort((a, b) => {
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
  private sortReviewItems(
    items: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return items.sort((a, b) => {
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
   * Рассчитывает "срочность" повторения элемента.
   */
  private calculateUrgency(progress: SrsProgress | null): number {
    if (!progress) {
      return 100; // Новые элементы самые срочные
    }

    const now = new Date().getTime();
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

  /**
   * Перемешивает массив по алгоритму Фишера-Йетса
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
