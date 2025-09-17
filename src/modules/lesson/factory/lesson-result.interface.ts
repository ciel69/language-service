// src/lesson/factory/lesson-result.interface.ts

/**
 * Общий интерфейс для результата любого урока.
 * Может быть расширен для конкретных типов.
 */
export interface LessonResult<T = any> {
  // Уникальный идентификатор урока (может быть ID из БД или сгенерированный)
  lessonId: string | number;
  // Тип урока (например, 'kana', 'kanji', 'course')
  type: string;
  // Данные урока (зависит от типа)
  data: T;
  // Метаинформация, если нужно
  metadata?: Record<string, any>;
}

/**
 * Интерфейс для данных, необходимых для инвалидации кэша после завершения урока.
 * Предоставляется сервисом-генератором.
 */
export interface LessonCompletionData {
  // keycloakId пользователя, чей кэш нужно инвалидировать
  userKeycloakId: string;
  // Дополнительные данные, если нужно (например, IDs обновленных сущностей)
  // invalidatedKeys?: string[]; // если понадобится более тонкая настройка
}

export type LessonType = 'kanji' | 'kana' | 'course';
