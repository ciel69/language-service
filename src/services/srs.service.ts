import { Injectable, Logger } from '@nestjs/common';

export interface SrsItem {
  id: number; // Уникальный ID элемента (например, Kana.id, Kanji.id, Word.id)
  type: 'kana' | 'kanji' | 'word' | 'grammar'; // Тип элемента
  // Можно добавить другие общие поля, если они будут нужны, например:
  // difficulty?: number; // Базовая сложность элемента
  // content?: string; // Содержимое для логирования/отладки
}

export type SrsStage =
  | 'new'
  | 'learning'
  | 'review'
  | 'review_2'
  | 'review_3'
  | 'mastered';

export interface SrsProgress {
  id: number; // ID записи прогресса
  itemId: number; // ID элемента (SrsItem.id)
  itemType: 'kana' | 'kanji' | 'word' | 'grammar'; // Тип элемента
  userId: number; // ID пользователя

  progress: number; // Прогресс 0-100
  correctAttempts: number;
  incorrectAttempts: number;
  perceivedDifficulty: number; // 1-4
  stage: SrsStage;

  // Метаданные для SRS
  nextReviewAt: Date | null; // Дата следующего запланированного повторения
  lastReviewedAt: Date | null; // Дата последнего повторения
  reviewCount: number; // Количество успешных повторений подряд

  createdAt: Date;
  updatedAt: Date;
}

export class SrsExerciseResultDto {
  itemId: number;
  itemType: 'kana' | 'kanji' | 'word' | 'grammar';
  isCorrect: boolean;
  responseTimeMs?: number; // Опционально: время ответа
  // Можно добавить другие метрики
}

// --- SRS Configuration ---
const SRS_BASE_INTERVALS_MS = {
  learning: 4 * 60 * 60 * 1000, // 4 часа
  review_1: 24 * 60 * 60 * 1000, // 1 день
  review_2: 3 * 24 * 60 * 60 * 1000, // 3 дня
  review_3: 7 * 24 * 60 * 60 * 1000, // 1 неделя
  mastered: 30 * 24 * 60 * 60 * 1000, // 1 месяц
};

const DIFFICULTY_MULTIPLIERS = [1.5, 1.3, 1.0, 0.7]; // 1 - легко, 4 - сложно

@Injectable()
export class SrsService {
  private readonly logger = new Logger(SrsService.name);

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
      // --- Логика для правильного ответа ---
      let increment = 0;
      switch (currentStage) {
        case 'new':
          increment = 15 + (1 - normalizedDifficulty) * 10; // От 15 (сложный) до 25 (легкий)
          newStage = 'learning';
          break;
        case 'learning':
          increment = 10 + (1 - normalizedDifficulty) * 5; // От 10 (сложный) до 15 (легкий)
          if (newProgress + increment >= 80) newStage = 'review';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          increment = 7 + (1 - normalizedDifficulty) * 3; // От 7 (сложный) до 10 (легкий)
          if (newProgress + increment >= 100) {
            newProgress = 100;
            newStage = 'mastered';
          }
          break;
        case 'mastered':
          increment = 1 + (1 - normalizedDifficulty) * 1; // От 1 (сложный) до 2 (легкий)
          break;
        default:
          increment = 5;
      }
      newProgress = Math.min(100, currentProgress + increment);
    } else {
      // --- Логика для неправильного ответа ---
      let decrement = 0;
      switch (currentStage) {
        case 'new':
          decrement = 3 + normalizedDifficulty * 5; // От 3 (легкий) до 8 (сложный)
          break;
        case 'learning':
          decrement = 8 + normalizedDifficulty * 7; // От 8 (легкий) до 15 (сложный)
          if (newProgress - decrement < 30) newStage = 'new';
          break;
        case 'review':
        case 'review_2':
        case 'review_3':
          decrement = 12 + normalizedDifficulty * 8; // От 12 (легкий) до 20 (сложный)
          newStage = 'learning'; // Сброс на стадию изучения
          break;
        case 'mastered':
          decrement = 15 + normalizedDifficulty * 10; // От 15 (легкий) до 25 (сложный)
          newStage = 'review'; // Сильный сброс
          break;
        default:
          decrement = 10;
      }
      newProgress = Math.max(0, currentProgress - decrement);
    }

    // --- Корректировка стадии на основе нового прогресса (если не была изменена выше) ---
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
   * @param stage Текущая стадия изучения элемента.
   * @param perceivedDifficulty Воспринимаемая сложность (1-4).
   * @returns Интервал в миллисекундах.
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
    const difficultyIndex = Math.max(0, Math.min(3, perceivedDifficulty - 1)); // 0-3
    const multiplier = DIFFICULTY_MULTIPLIERS[difficultyIndex];
    return baseMs * multiplier;
  }

  /**
   * Проверяет, нужно ли повторить элемент на основе даты последнего обновления и интервала.
   * @param nextReviewAt Дата следующего запланированного повторения.
   * @returns True, если нужно повторить.
   */
  isDueForReview(nextReviewAt: Date | null): boolean {
    if (!nextReviewAt) {
      return false; // Если дата не установлена, не требует повторения
    }
    const now = new Date();
    return now >= nextReviewAt;
  }

  /**
   * Обновляет прогресс SRS на основе результатов упражнения.
   * @param progress Текущий прогресс SRS.
   * @param result Результат упражнения.
   * @returns Обновленный объект прогресса.
   */
  updateProgressFromResult(
    progress: SrsProgress,
    result: SrsExerciseResultDto,
  ): SrsProgress {
    const { newProgress, newStage } = this.calculateProgressChange(
      result.isCorrect,
      progress.progress,
      progress.stage,
      progress.perceivedDifficulty, // Используем текущую сложность
    );

    const updatedProgress: SrsProgress = {
      ...progress,
      progress: newProgress,
      stage: newStage,
      // Обновляем статистику
      correctAttempts: result.isCorrect
        ? progress.correctAttempts + 1
        : progress.correctAttempts,
      incorrectAttempts: result.isCorrect
        ? progress.incorrectAttempts
        : progress.incorrectAttempts + 1,
      // lastReviewedAt обновляется на текущую дату
      lastReviewedAt: new Date(),
      // reviewCount увеличивается только при успешном повторении на стадии review+
      reviewCount:
        result.isCorrect &&
        ['review', 'review_2', 'review_3', 'mastered'].includes(newStage)
          ? progress.reviewCount + 1
          : progress.reviewCount,
      updatedAt: new Date(),
    };

    // --- Расчет nextReviewAt ---
    const intervalMs = this.calculateNextInterval(
      newStage,
      progress.perceivedDifficulty,
    );
    const nextReviewDate = new Date(Date.now() + intervalMs);
    updatedProgress.nextReviewAt = nextReviewDate;

    // --- Обновление perceivedDifficulty ---
    // Простая логика: если пользователь часто ошибается, элемент считается сложным
    const totalAttempts =
      updatedProgress.correctAttempts + updatedProgress.incorrectAttempts;
    if (totalAttempts > 3) {
      // После 3+ попыток
      const accuracy = updatedProgress.correctAttempts / totalAttempts;
      if (accuracy < 0.5) {
        updatedProgress.perceivedDifficulty = 4; // сложно
      } else if (accuracy < 0.8) {
        updatedProgress.perceivedDifficulty = 3; // нормально
      } else {
        updatedProgress.perceivedDifficulty = 2; // легко
      }
    }

    return updatedProgress;
  }

  /**
   * Определяет, нужно ли включать элемент в текущую сессию SRS.
   * @param progress Прогресс SRS элемента.
   * @returns True, если элемент должен быть включен.
   */
  shouldBeIncludedInSession(progress: SrsProgress | null): boolean {
    if (!progress) {
      // Элемент без прогресса - новый, должен быть включен
      return true;
    }

    // Элемент с прогрессом 100% и не просроченный - не включаем
    if (
      progress.progress === 100 &&
      !this.isDueForReview(progress.nextReviewAt)
    ) {
      return false;
    }

    // Все остальные элементы (новые, в процессе изучения, просроченные) - включаем
    return true;
  }

  // src/srs/srs.service.ts (фрагмент метода sortItemsForSession)

  /**
   * Сортирует элементы для SRS-сессии по приоритету.
   * Приоритет определяется комбинацией просрочки и прогресса.
   * @param itemsWithProgress Массив элементов с их прогрессом.
   * @returns Отсортированный массив.
   */
  sortItemsForSession(
    itemsWithProgress: { item: SrsItem; progress: SrsProgress | null }[],
  ): { item: SrsItem; progress: SrsProgress | null }[] {
    return itemsWithProgress.sort((a, b) => {
      const progressA = a.progress;
      const progressB = b.progress;

      // --- 1. Приоритет: элементы с существующим прогрессом (в процессе изучения) первые ---
      const hasProgressA = progressA && progressA.progress > 0;
      const hasProgressB = progressB && progressB.progress > 0;

      if (hasProgressA && !hasProgressB) return -1; // A с прогрессом, B без -> A первее
      if (!hasProgressA && hasProgressB) return 1; // B с прогрессом, A без -> B первее
      // Если оба с прогрессом или оба без -> переходим к следующим критериям

      // --- 2. Приоритет: срочность повторения (комбинация просрочки и прогресса) ---
      // Рассчитываем "срочность" как комбинацию просрочки и прогресса.
      // Чем больше значение, тем срочнее нужно повторять.
      const urgencyA = this.calculateUrgency(progressA);
      const urgencyB = this.calculateUrgency(progressB);

      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA; // Сортируем по убыванию срочности (срочные первые)
      }

      // --- 3. Если срочность одинакова, сортируем по ID для стабильности ---
      return a.item.id - b.item.id;
    });
  }

  /**
   * Рассчитывает "срочность" повторения элемента.
   * @param progress Прогресс элемента.
   * @returns Значение срочности (чем больше, тем срочнее).
   */
  private calculateUrgency(progress: SrsProgress | null): number {
    if (!progress) {
      // Новый элемент. Приоритет средний/низкий.
      return 0;
    }

    const now = new Date().getTime();
    const nextReviewAt = progress.nextReviewAt?.getTime() ?? now;
    const lastReviewedAt = progress.lastReviewedAt?.getTime() ?? 0;
    const progressValue = progress.progress;

    // --- Факторы срочности ---

    // 1. Просрочка: насколько элемент просрочен (в часах)
    const overdueHours = Math.max(0, (now - nextReviewAt) / (1000 * 60 * 60));
    const overdueFactor = overdueHours; // Просто используем часы просрочки

    // 2. Прогресс: чем ниже прогресс, тем срочнее
    // Инвертируем прогресс, чтобы низкий прогресс давал высокую срочность
    const progressFactor = 100 - progressValue; // 0-100 -> 100-0

    // 3. Давность повторения: чем дольше не повторялся, тем срочнее
    // (только если прогресс > 0)
    let timeSinceLastReviewFactor = 0;
    if (progressValue > 0) {
      const hoursSinceLastReview = (now - lastReviewedAt) / (1000 * 60 * 60);
      // Логарифмическая шкала, чтобы избежать слишком больших значений
      timeSinceLastReviewFactor = Math.log10(hoursSinceLastReview + 1); // +1 чтобы избежать log(0)
    }

    // --- Комбинируем факторы ---
    // Веса факторов можно настраивать
    const WEIGHT_OVERDUE = 0.5;
    const WEIGHT_PROGRESS = 0.3; // Прогресс немного менее важен, чем просрочка
    const WEIGHT_TIME = 1; // Давность менее важна

    const urgency =
      overdueFactor * WEIGHT_OVERDUE +
      progressFactor * WEIGHT_PROGRESS +
      timeSinceLastReviewFactor * WEIGHT_TIME;

    return Math.max(0, urgency); // Убеждаемся, что срочность не отрицательна
  }

  // ... остальная часть SrsService ...
}
