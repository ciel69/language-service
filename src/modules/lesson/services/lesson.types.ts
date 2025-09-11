// src/lesson/service/lesson.types.ts
import { KanaLessonSymbol } from '@/modules/kana/kana.service';
// import { KanjiLessonSymbol } from '@/modules/kanji/interfaces'; // Для будущего использования

// --- Общие типы ---
export type LessonSymbolType = 'kana' | 'kanji';

// Базовый интерфейс символа (минимальный общий знаменатель)
export interface BaseLessonSymbol {
  id: number;
  char: string;
  createdAt?: Date;
  [key: string]: any; // Для гибкости
}

// Базовый интерфейс символа с прогрессом
export interface BaseLessonSymbolWithProgress extends BaseLessonSymbol {
  progress: number;
}

// Базовый интерфейс задачи
export interface BaseLessonTask {
  id: number;
  taskType: string;
  symbols?: BaseLessonSymbolWithProgress[];
  question: string;
  options?: any[];
  correctAnswer?: any;
  config?: Record<string, any>;
}

// Базовый интерфейс сгенерированного урока
export interface BaseGeneratedLesson {
  lessonId: number;
  title: string;
  description: string;
  tasks: BaseLessonTask[];
  estimatedDuration: number;
}

// Базовая конфигурация генерации
export interface BaseLessonGenerationConfig {
  includeWritingTasks?: boolean;
  includeAudioTasks?: boolean;
  includeStrokeOrderTasks?: boolean;
  includePairingTasks?: boolean;
  includeReverseRecognition?: boolean;
  includeCombinations?: boolean;
  symbolProgress?: Record<number, number>;
  maxCombinationLength?: number;
  completedTaskTypes?: Record<number, Set<string>>;
}

// --- Конкретные типы для КАНЫ ---
export interface KanaLessonSymbolWithProgress extends KanaLessonSymbol {
  progress: number;
}

export interface KanaLessonTask extends BaseLessonTask {
  taskType:
    | 'kana-recognition'
    | 'kana-reverse-recognition'
    | 'kana-writing'
    | 'kana-stroke-order'
    | 'kana-audio'
    | 'flashcard'
    | 'pairing'
    | string;
  symbols?: KanaLessonSymbolWithProgress[];
  options?: (string | KanaLessonSymbolWithProgress)[];
  correctAnswer?: string | string[];
}

export interface GeneratedKanaLesson extends BaseGeneratedLesson {
  tasks: KanaLessonTask[];
}

export type KanaLessonGenerationConfig = BaseLessonGenerationConfig;
