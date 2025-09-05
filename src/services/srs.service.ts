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
      // --- Логика для правильного ответа (меньшие инкременты) ---
      let increment = 0;
      switch (currentStage) {
        case 'new':
          increment = 5 + (1 - normalizedDifficulty) * 3; // От 5 (сложный) до 8 (легкий)
          newStage = 'learning';
          break;
        case 'learning':
          increment = 4 + (1 - normalizedDifficulty) * 2; // От 4 (сложный) до 6 (легкий)
          if (newProgress + increment >= 80) newStage = 'review';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          increment = 3 + (1 - normalizedDifficulty) * 2; // От 3 (сложный) до 5 (легкий)
          if (newProgress + increment >= 100) {
            newProgress = 100;
            newStage = 'mastered';
          }
          break;
        case 'mastered':
          increment = 1 + (1 - normalizedDifficulty) * 1; // От 1 (сложный) до 2 (легкий)
          break;
        default:
          increment = 3;
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
      return false;
    }
    const now = new Date();
    return now >= nextReviewAt;
  }

  /**
   * Определяет, нужно ли включать элемент в текущую сессию SRS.
   */
  shouldBeIncludedInSession(progress: SrsProgress | null): boolean {
    if (!progress) {
      return true;
    }

    if (
      progress.progress === 100 &&
      !this.isDueForReview(progress.nextReviewAt)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Сортирует элементы для SRS-сессии по приоритету.
   */
  sortItemsForSession(
    itemsWithProgress: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return itemsWithProgress.sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      const hasProgressA = progressA && progressA.progress > 0;
      const hasProgressB = progressB && progressB.progress > 0;

      if (hasProgressA && !hasProgressB) return -1;
      if (!hasProgressA && hasProgressB) return 1;

      const urgencyA = this.calculateUrgency(progressA);
      const urgencyB = this.calculateUrgency(progressB);

      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA;
      }

      return a.item.id - b.item.id;
    });
  }

  /**
   * Рассчитывает "срочность" повторения элемента.
   */
  private calculateUrgency(progress: SrsProgress | null): number {
    if (!progress) {
      return 0;
    }

    const now = new Date().getTime();
    const nextReviewAt = progress.nextReviewAt?.getTime() ?? now;
    const progressValue = progress.progress;

    const overdueHours = Math.max(0, (now - nextReviewAt) / (1000 * 60 * 60));
    const progressFactor = 100 - progressValue;

    const urgency = overdueHours * 0.5 + progressFactor * 0.3;

    return Math.max(0, urgency);
  }
}
