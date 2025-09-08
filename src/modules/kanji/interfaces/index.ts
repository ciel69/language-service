// src/kanji/interfaces/kanji-lesson.interface.ts

export interface KanjiLessonSymbol {
  id: number;
  char: string;
  on: string[];
  kun: string[];
  meaning: string;
  level: string; // Изменим с union type на string для гибкости
  progress?: number;
  progressId?: number;
}

export interface KanjiLessonSymbolWithProgress extends KanjiLessonSymbol {
  progress: number;
  correctAnswer?: string | string[];
}

export interface KanjiLessonTask {
  id: number;
  taskType: string;
  symbols?: KanjiLessonSymbol[];
  question: string;
  options?: (string | KanjiLessonSymbol)[];
  correctAnswer?: string | string[];
  config?: Record<string, any>;
}

export interface GeneratedKanjiLesson {
  lessonId: number;
  title: string;
  description: string;
  tasks: KanjiLessonTask[];
  estimatedDuration: number;
}

export interface KanjiLessonGenerationConfig {
  includeWritingTasks?: boolean;
  includeAudioTasks?: boolean;
  includeMeaningTasks?: boolean;
  includeReadingTasks?: boolean;
  includeCompoundsTasks?: boolean;
  includeStrokeOrderTasks?: boolean;
  symbolProgress?: Record<number, number>;
  completedTaskTypes?: Record<number, Set<string>>;
}
