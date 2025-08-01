// src/lesson/entities/lesson-task.types.ts

// --- Типы для Options и CorrectAnswer ---

/**
 * Простой массив строковых вариантов.
 * @example ["а", "и", "у", "э", "о"]
 */
export type StringOptions = string[];

/**
 * Массив объектов для сложных вариантов (например, с изображениями, типами).
 * @example [{ type: 'text', value: 'а' }, { type: 'image', value: '/imgs/a.png' }]
 */
export type ObjectOptions = Record<string, any>[];

/**
 * Объект, содержащий два массива для задач на сопоставление.
 * @example { left: ["ねこ", "いぬ"], right: ["/images/cat.png", "/images/dog.png"] }
 */
export interface PairingOptions {
  left: string[] | ObjectOptions; // Левые элементы
  right: string[] | ObjectOptions; // Правые элементы
}

/**
 * Объект, содержащий пары для задач на сопоставление (альтернативный формат).
 * @example [{ left: "ねこ", right: "/images/cat.png" }, { left: "いぬ", right: "/images/dog.png" }]
 */
export type PairedOptions = Array<{
  left: string | Record<string, any>;
  right: string | Record<string, any>;
}>;

/**
 * Тип для поля `options` в LessonTask.
 * Может быть простым массивом, массивом объектов или структурой для пар.
 */
export type LessonTaskOptions =
  | StringOptions
  | ObjectOptions
  | PairingOptions
  | PairedOptions
  | null;

/**
 * Тип для поля `correctAnswer` в LessonTask.
 * Часто совпадает с форматом `options` или является подмножеством.
 */
export type LessonTaskCorrectAnswer =
  | StringOptions
  | ObjectOptions
  | PairedOptions
  | string
  | null;
