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

// Максимальный прогресс за одну сессию
const MAX_PROGRESS_INCREMENT_PER_SESSION = 15;

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
      // --- Логика для правильного ответа (максимальный прирост 15%) ---
      let increment = 0;
      switch (currentStage) {
        case 'new':
          increment = Math.min(
            5 + (1 - normalizedDifficulty) * 3,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          newStage = 'learning';
          break;
        case 'learning':
          increment = Math.min(
            4 + (1 - normalizedDifficulty) * 2,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          if (newProgress + increment >= 80) newStage = 'review';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          increment = Math.min(
            3 + (1 - normalizedDifficulty) * 2,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          if (newProgress + increment >= 100) {
            newProgress = 100;
            newStage = 'mastered';
          }
          break;
        case 'mastered':
          increment = Math.min(
            1 + (1 - normalizedDifficulty) * 1,
            MAX_PROGRESS_INCREMENT_PER_SESSION,
          );
          break;
        default:
          increment = Math.min(3, MAX_PROGRESS_INCREMENT_PER_SESSION);
      }
      newProgress = Math.min(100, currentProgress + increment);
    } else {
      // --- Логика для неправильного ответа ---
      let decrement = 0;
      switch (currentStage) {
        case 'new':
          decrement = 3 + normalizedDifficulty * 3; // От 3 (легкий) до 6 (сложный)
          break;
        case 'learning':
          decrement = 5 + normalizedDifficulty * 4; // От 5 (легкий) до 9 (сложный)
          if (newProgress - decrement < 30) newStage = 'new';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          decrement = 8 + normalizedDifficulty * 5; // От 8 (легкий) до 13 (сложный)
          newStage = 'learning'; // Сброс на стадию изучения
          break;
        case 'mastered':
          decrement = 10 + normalizedDifficulty * 8; // От 10 (легкий) до 18 (сложный)
          newStage = 'review'; // Сильный сброс
          break;
        default:
          decrement = 5;
      }
      newProgress = Math.max(0, currentProgress - decrement);
    }

    // --- Корректировка стадии на основе нового прогресса ---
    if (newStage === currentStage) {
      if (newProgress === 100 && currentStage !== 'mastered') {
        newStage = 'mastered';
      } else if (
        newProgress >= 80 &&
        ['new', 'learning'].includes(currentStage)
      ) {
        newStage = 'review';
      } else if (newProgress < 30 && currentStage === 'learning') {
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

    // Если элемент уже изучался сегодня и имеет прогресс > 40% и нет ошибок, не включаем его
    if (
      this.wasReviewedToday(progress.lastReviewedAt) &&
      progress.progress > 40
    ) {
      return false;
    }

    // Если элемент просрочен или новый - включаем
    return this.isDueForReview(progress.nextReviewAt) || progress.progress < 40;
  }

  /**
   * Сортирует элементы для SRS-сессии по приоритету с балансом новых и старых.
   */
  sortItemsForSession(
    itemsWithProgress: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    // Разделяем элементы на группы
    const itemsWithMultipleErrors: {
      item: SrsItem;
      progress: SrsProgress | null;
    }[] = [];
    const itemsWithSingleError: {
      item: SrsItem;
      progress: SrsProgress | null;
    }[] = [];
    const newItems: { item: SrsItem; progress: SrsProgress | null }[] = [];
    const learnedItems: { item: SrsItem; progress: SrsProgress | null }[] = [];

    itemsWithProgress.forEach((item) => {
      if (this.hadErrorsInLastSession(item.progress)) {
        itemsWithMultipleErrors.push(item);
      } else if (this.hadRecentError(item.progress)) {
        itemsWithSingleError.push(item);
      } else {
        const hasProgress = item.progress && item.progress.progress > 0;
        if (hasProgress) {
          learnedItems.push(item);
        } else {
          newItems.push(item);
        }
      }
    });

    // Сортируем каждую группу по отдельности
    const sortedItemsWithMultipleErrors = this.sortItemsWithMultipleErrors(
      itemsWithMultipleErrors,
    );
    const sortedItemsWithSingleError =
      this.sortItemsWithSingleError(itemsWithSingleError);
    const sortedNewItems = this.sortNewItems(newItems);
    const sortedLearnedItems = this.sortLearnedItems(learnedItems);

    // Комбинируем с приоритетом:
    // 1. Элементы с 2+ ошибками
    // 2. Элементы с 1 ошибкой
    // 3. Новые элементы
    // 4. Изученные элементы
    const result: { item: SrsItem; progress: SrsProgress | null }[] = [];

    // Добавляем элементы с ошибками первыми
    result.push(...sortedItemsWithMultipleErrors);
    result.push(...sortedItemsWithSingleError);

    // Затем добавляем новые и изученные элементы с балансом
    const remainingSlots = Math.max(
      0,
      itemsWithProgress.length -
        sortedItemsWithMultipleErrors.length -
        sortedItemsWithSingleError.length,
    );

    const newItemsCount = Math.min(
      Math.ceil(remainingSlots * 0.6),
      sortedNewItems.length,
    );
    const learnedItemsCount = Math.min(
      Math.ceil(remainingSlots * 0.4),
      sortedLearnedItems.length,
    );

    // Добавляем новые элементы
    result.push(...sortedNewItems.slice(0, newItemsCount));

    // Добавляем изученные элементы
    result.push(...sortedLearnedItems.slice(0, learnedItemsCount));

    // Если не хватает элементов, добавляем оставшиеся
    const currentCount = result.length;
    if (currentCount < itemsWithProgress.length) {
      const remainingNew = sortedNewItems.slice(newItemsCount);
      const remainingLearned = sortedLearnedItems.slice(learnedItemsCount);

      // Добавляем оставшиеся элементы вперемешку
      const remainingItems = [...remainingNew, ...remainingLearned];
      this.shuffleArray(remainingItems);
      result.push(
        ...remainingItems.slice(0, itemsWithProgress.length - currentCount),
      );
    }

    return result;
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

      // Элементы с большим количеством ошибок выше в списке
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

      // Если прогресс и ошибки равны, сортируем по ID
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

      // Элементы с ошибками выше по приоритету, чем новые
      if (progressA && progressB) {
        // Приоритет по прогрессу (меньше - выше)
        if (progressA.progress !== progressB.progress) {
          return progressA.progress - progressB.progress;
        }
      }

      // Если прогресс равен, сортируем по ID
      return a.item.id - b.item.id;
    });
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
   * Сортирует изученные элементы по срочности
   */
  private sortLearnedItems(
    items: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return items.sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      // Проверяем, изучались ли элементы сегодня
      const wasReviewedTodayA = progressA
        ? this.wasReviewedToday(progressA.lastReviewedAt)
        : false;
      const wasReviewedTodayB = progressB
        ? this.wasReviewedToday(progressB.lastReviewedAt)
        : false;

      // Элементы, которые НЕ изучались сегодня, имеют больший приоритет
      if (wasReviewedTodayA && !wasReviewedTodayB) return 1;
      if (!wasReviewedTodayA && wasReviewedTodayB) return -1;

      // Сортируем по срочности
      const urgencyA = this.calculateUrgency(progressA);
      const urgencyB = this.calculateUrgency(progressB);

      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA;
      }

      // Если срочность одинаковая, сортируем по прогрессу (меньший прогресс - выше приоритет)
      if (progressA && progressB) {
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
