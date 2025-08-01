import { SrsStage } from '@/services/srs.service';

export type ProgressStage = 'new' | 'learning' | 'review' | 'mastered';

/**
 * Преобразует SRS-стадию в стадию прогресса сущности.
 * @param srsStage Стадия из SRS-сервиса.
 * @returns Соответствующая стадия прогресса.
 */
export function mapSrsStageToProgressStage(srsStage: SrsStage): ProgressStage {
  switch (srsStage) {
    case 'new':
      return 'new';
    case 'review': // Объединяем все стадии "повторения" в 'review'
    case 'review_2':
    case 'review_3':
      // Можно сделать более сложное преобразование, если нужно различать review_2, review_3
      // Например, ввести промежуточные стадии в ProgressStage
      // Пока объединим в 'review'
      return 'review';
    case 'mastered':
      return 'mastered';
    default:
      // Для неизвестных стадий возвращаем 'new' или бросаем ошибку
      console.warn(
        `Неизвестная SRS стадия: ${String(srsStage)}. Преобразована в 'new'.`,
      );
      return 'new';
  }
}

/**
 * (Опционально) Обратное преобразование, если нужно.
 * @param progressStage Стадия прогресса.
 * @returns Приблизительная SRS-стадия.
 */
export function mapProgressStageToSrsStage(
  progressStage: ProgressStage,
): SrsStage {
  switch (progressStage) {
    case 'new':
      return 'new';
    case 'learning': // Предполагаем, что это learning
      return 'learning';
    case 'review': // Предполагаем, что это review (самый базовый уровень review)
      return 'review';
    case 'mastered':
      return 'mastered';
    default:
      console.warn(
        `Неизвестная стадия прогресса: ${String(progressStage)}. Преобразована в 'new'.`,
      );
      return 'new';
  }
}
