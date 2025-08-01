// src/lesson/entities/lesson-task-config.interface.ts

import {
  LessonTaskOptions,
  LessonTaskCorrectAnswer,
  StringOptions,
  ObjectOptions,
  PairingOptions,
  PairedOptions,
} from './lesson-task.types';

// --- Базовый интерфейс конфига ---
/**
 * Базовая конфигурация для любой задачи.
 * Содержит общие настройки и поля, специфичные для типа задачи.
 */
export interface BaseTaskConfig {
  /**
   * Режим отображения или типа задачи.
   * @example 'show_symbol', 'audio', 'flashcard', 'word-to-image'
   */
  mode?: string;

  /**
   * Варианты ответов или элементы задачи.
   * Если `null`, варианты генерируются динамически или берутся из связанной сущности (`taskId`).
   * @see LessonTaskOptions
   */
  options?: LessonTaskOptions;

  /**
   * Правильный ответ(ы) для задачи.
   * Если `null`, правильный ответ определяется логикой (например, совпадение по ID).
   * @see LessonTaskCorrectAnswer
   */
  correctAnswer?: LessonTaskCorrectAnswer;

  /**
   * Дополнительные настройки, специфичные для режима или типа задачи.
   */
  settings?: Record<string, any>;

  // Можно добавить другие общие поля
  // timeLimit?: number; // Ограничение времени
  // hintsAllowed?: boolean; // Разрешены ли подсказки
  // [key: string]: any; // Для расширения
}

// --- Конкретные Интерфейсы Конфигов ---

// --- Для Kana/Kanji/Word Tasks ---
export interface RecognitionTaskConfig extends BaseTaskConfig {
  mode: 'show_symbol' | 'show_romaji' | 'audio' | 'image'; // Уточняем режимы
  options?: StringOptions | ObjectOptions | null; // Уточняем тип options
  correctAnswer?: string | StringOptions | null; // Уточняем тип correctAnswer
  options_count?: number; // Количество вариантов
  shuffle_options?: boolean;
}

export interface WritingTaskConfig extends BaseTaskConfig {
  mode: 'stroke' | 'handwriting' | 'trace';
  show_hint?: boolean;
  time_limit?: number;
  // correctAnswer и options могут быть null, так как проверка идет по taskId
}

export interface AudioTaskConfig extends BaseTaskConfig {
  speed?: number;
  repeats?: number;
  // source?: 'tts' | 'file';
}

// --- Для Grammar Tasks ---
export interface GrammarTaskConfig extends BaseTaskConfig {
  // mode наследуется из BaseTaskConfig
  // sentence_template?: string; // Шаблон, если нужно переопределить
  // options и correctAnswer будут определены в конкретной задаче (ParticleChoice, FillInTheBlank и т.д.)
}

// --- Для Pairing Tasks ---
export interface PairingTaskConfig extends BaseTaskConfig {
  mode:
    | 'word-to-image'
    | 'romaji-to-kana'
    | 'kanji-to-meaning'
    | 'sentence-to-translation'
    | string;
  options?: PairingOptions | PairedOptions | null; // Явно указываем возможные типы
  correctAnswer?: PairedOptions | null; // Для паринга правильный ответ - это список пар
  settings?: {
    shuffleLeft?: boolean;
    shuffleRight?: boolean;
    allowMultipleMatches?: boolean;
    maxPairs?: number; // Максимальное количество пар для отображения
    // ... другие настройки
  };
}

// --- Для Flashcard ---
export interface FlashcardTaskConfig extends BaseTaskConfig {
  show: 'char' | 'meaning' | 'romaji' | 'both' | 'image';
  auto_flip_delay?: number;
  // options и correctAnswer обычно null, данные берутся из taskId
}

// --- Карта типов конфигов ---
// (Остальная часть TaskConfigMap остается прежней или обновляется аналогично)
// ...
