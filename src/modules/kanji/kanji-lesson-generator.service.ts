// src/kanji/service/kanji-lesson-generator.service.ts

import { Injectable } from '@nestjs/common';
import { SrsProgress, SrsService } from '@/services/srs.service';
import {
  KanjiLessonSymbol,
  KanjiLessonSymbolWithProgress,
  KanjiLessonTask,
  GeneratedKanjiLesson,
  KanjiLessonGenerationConfig,
} from './interfaces';

@Injectable()
export class KanjiLessonGeneratorService {
  private taskIdCounter = 1;

  constructor(private readonly srsService: SrsService) {}

  /**
   * Генерирует урок кандзи на основе символов с учетом SRS
   */
  async generateKanjiLesson(
    symbolsToLearn: KanjiLessonSymbol[],
    learnedSymbols: KanjiLessonSymbol[],
    srsProgressMap: Record<number, SrsProgress>,
    config: KanjiLessonGenerationConfig = {},
  ): Promise<GeneratedKanjiLesson> {
    const {
      includeWritingTasks = true,
      includeAudioTasks = true,
      includeMeaningTasks = true,
      includeReadingTasks = true,
      includeStrokeOrderTasks = true,
      completedTaskTypes = {},
    } = config;

    const tasks: KanjiLessonTask[] = [];
    const availableSymbols = [...symbolsToLearn, ...learnedSymbols];

    // Добавляем прогресс к символам из SRS
    const symbolsWithProgress: KanjiLessonSymbolWithProgress[] =
      symbolsToLearn.map((symbol) => ({
        ...symbol,
        progress: srsProgressMap[symbol.id]?.progress || 0,
      }));

    const learnedSymbolsWithProgress: KanjiLessonSymbolWithProgress[] =
      learnedSymbols.map((symbol) => ({
        ...symbol,
        progress: srsProgressMap[symbol.id]?.progress || 80,
      }));

    const allSymbolsWithProgress = [
      ...symbolsWithProgress,
      ...learnedSymbolsWithProgress,
    ];

    // Определяем количество задач
    const taskCount = this.determineTaskCount(symbolsToLearn.length);

    // Для НОВЫХ символов: первыми всегда аудирование и значение
    const newSymbols = symbolsWithProgress.filter((s) => s.progress < 10);

    for (const symbol of newSymbols) {
      // 1. Аудирование (обязательно первая задача для новых символов)
      if (includeAudioTasks) {
        tasks.push(
          this.generateAudioTask([symbol], allSymbolsWithProgress, tasks),
        );
      }

      // 2. Значение (вторая задача для новых символов)
      if (includeMeaningTasks) {
        tasks.push(
          this.generateMeaningTask([symbol], allSymbolsWithProgress, tasks),
        );
      }
    }

    // Для символов, которые нужно повторить (SRS), добавляем задачи на повторение
    const symbolsToReview = symbolsWithProgress.filter((symbol) => {
      const progress = srsProgressMap[symbol.id];
      return progress && this.srsService.shouldBeIncludedInSession(progress);
    });

    // Добавляем задачи на повторение для символов, которые просрочены
    for (const symbol of symbolsToReview) {
      const srsProgress = srsProgressMap[symbol.id];
      if (srsProgress) {
        // Определяем тип задачи на основе стадии SRS
        const taskType = this.selectReviewTaskType(srsProgress.stage);

        let task: KanjiLessonTask | null = null;

        switch (taskType) {
          case 'kanji-meaning':
            if (includeMeaningTasks) {
              task = this.generateMeaningTask(
                [symbol],
                allSymbolsWithProgress,
                tasks,
              );
            }
            break;
          case 'kanji-reading':
            if (includeReadingTasks) {
              task = this.generateReadingTask(
                [symbol],
                allSymbolsWithProgress,
                tasks,
              );
            }
            break;
          case 'kanji-writing':
            if (includeWritingTasks) {
              task = this.generateWritingTask([symbol], tasks);
            }
            break;
          case 'kanji-audio':
            if (includeAudioTasks) {
              task = this.generateAudioTask(
                [symbol],
                allSymbolsWithProgress,
                tasks,
              );
            }
            break;
        }

        if (task) {
          tasks.push(task);
        }
      }
    }

    // Генерируем остальные задачи для новых символов
    const usedTaskTypes = new Set<string>(); // Отслеживаем типы задач
    const usedSymbols = new Map<number, number>(); // symbolId -> count

    while (tasks.length < taskCount) {
      const taskType = this.selectTaskTypeWithProgressAwareness(
        includeWritingTasks,
        includeAudioTasks,
        includeMeaningTasks,
        includeReadingTasks,
        includeStrokeOrderTasks,
        symbolsWithProgress,
      );

      // Выбираем случайный символ
      const selectedSymbols = [this.getRandomElement(symbolsWithProgress)];

      // Проверяем, не использовался ли этот символ слишком часто
      const symbolId = selectedSymbols[0].id;
      const symbolUsageCount = usedSymbols.get(symbolId) || 0;

      // Ограничиваем использование одного символа подряд
      if (symbolUsageCount >= 2) {
        // Выбираем другой символ
        const otherSymbols = symbolsWithProgress.filter(
          (s) => s.id !== symbolId,
        );
        if (otherSymbols.length > 0) {
          selectedSymbols[0] = this.getRandomElement(otherSymbols);
        }
      }

      let task: KanjiLessonTask | null = null;

      switch (taskType) {
        case 'kanji-meaning':
          if (includeMeaningTasks) {
            task = this.generateMeaningTask(
              selectedSymbols,
              allSymbolsWithProgress,
              tasks,
            );
          }
          break;
        case 'kanji-reading':
          if (includeReadingTasks) {
            task = this.generateReadingTask(
              selectedSymbols,
              allSymbolsWithProgress,
              tasks,
            );
          }
          break;
        case 'kanji-writing':
          if (includeWritingTasks) {
            task = this.generateWritingTask(selectedSymbols, tasks);
          }
          break;
        case 'kanji-stroke-order':
          if (includeStrokeOrderTasks) {
            task = this.generateStrokeOrderTask(selectedSymbols, tasks);
          }
          break;
        case 'kanji-audio':
          if (includeAudioTasks) {
            task = this.generateAudioTask(
              selectedSymbols,
              allSymbolsWithProgress,
              tasks,
            );
          }
          break;
        case 'flashcard':
          task = this.generateFlashcardTask(selectedSymbols, tasks);
          break;
      }

      if (task) {
        // Проверяем, что задача не дублирует предыдущую
        if (!this.isDuplicateTask(task, tasks)) {
          tasks.push(task);
          // Обновляем счетчики использования
          usedSymbols.set(symbolId, (usedSymbols.get(symbolId) || 0) + 1);
        }
      }
    }

    // Перемешиваем задачи с учетом ограничений
    const shuffledTasks = this.shuffleTasksWithConstraints(tasks);

    // Назначаем ID
    shuffledTasks.forEach((task) => {
      task.id = this.generateTaskId();
    });

    return {
      lessonId: Date.now(),
      title: 'Урок кандзи',
      description: `Изучение ${symbolsToLearn.length} иероглифов`,
      tasks: shuffledTasks.slice(0, taskCount),
      estimatedDuration: this.estimateLessonDuration(
        shuffledTasks.slice(0, taskCount),
      ),
    };
  }

  /**
   * Проверяет, является ли задача дубликатом предыдущих
   */
  private isDuplicateTask(
    task: KanjiLessonTask,
    existingTasks: KanjiLessonTask[],
  ): boolean {
    // Проверяем последние 2 задачи
    const recentTasks = existingTasks.slice(-2);

    return recentTasks.some(
      (existingTask) =>
        existingTask.taskType === task.taskType &&
        existingTask.symbols?.[0]?.id === task.symbols?.[0]?.id,
    );
  }

  /**
   * Перемешивает задачи с учетом ограничений
   */
  private shuffleTasksWithConstraints(
    tasks: KanjiLessonTask[],
  ): KanjiLessonTask[] {
    // Сначала перемешиваем все задачи
    const shuffledTasks = [...tasks];
    this.shuffleArray(shuffledTasks);

    // Убеждаемся, что нет одинаковых задач подряд
    for (let i = 1; i < shuffledTasks.length; i++) {
      const currentTask = shuffledTasks[i];
      const previousTask = shuffledTasks[i - 1];

      // Если задачи одинаковые, ищем другую задачу
      if (
        currentTask.taskType === previousTask.taskType &&
        currentTask.symbols?.[0]?.id === previousTask.symbols?.[0]?.id
      ) {
        // Ищем задачу, которая не совпадает с предыдущей
        for (let j = i + 1; j < shuffledTasks.length; j++) {
          const nextTask = shuffledTasks[j];
          if (
            nextTask.taskType !== previousTask.taskType ||
            nextTask.symbols?.[0]?.id !== previousTask.symbols?.[0]?.id
          ) {
            // Меняем местами
            [shuffledTasks[i], shuffledTasks[j]] = [
              shuffledTasks[j],
              shuffledTasks[i],
            ];
            break;
          }
        }
      }
    }

    return shuffledTasks;
  }

  /**
   * Выбирает тип задачи для повторения на основе стадии SRS
   */
  private selectReviewTaskType(stage: string): string {
    const reviewTaskTypes = [
      'kanji-meaning',
      'kanji-reading',
      'kanji-writing',
      'kanji-audio',
    ];

    // Для разных стадий разные приоритеты
    switch (stage) {
      case 'new':
      case 'learning':
        // Для новых символов приоритет на аудирование и значение
        return Math.random() > 0.5 ? 'kanji-audio' : 'kanji-meaning';
      case 'review':
      case 'review_2':
      case 'review_3':
        // Для повторения - смешанные задачи
        return this.getRandomElement(reviewTaskTypes);
      case 'mastered':
        // Для освоенных - более сложные задачи
        return Math.random() > 0.5 ? 'kanji-reading' : 'kanji-writing';
      default:
        return this.getRandomElement(reviewTaskTypes);
    }
  }

  /**
   * Рассчитывает изменение прогресса на основе результата задачи
   */
  calculateProgressChange(
    itemId: number,
    itemType: 'kana' | 'kanji' | 'word' | 'grammar',
    isCorrect: boolean,
    responseTimeMs: number,
    currentProgress: SrsProgress | null,
  ): { newProgress: number; newStage: string; nextReviewAt: Date | null } {
    const currentStage = currentProgress?.stage || 'new';
    const perceivedDifficulty = this.calculatePerceivedDifficulty(
      isCorrect,
      responseTimeMs,
      currentProgress,
    );

    const { newProgress, newStage } = this.srsService.calculateProgressChange(
      isCorrect,
      currentProgress?.progress || 0,
      currentStage as any,
      perceivedDifficulty,
    );

    const nextInterval = this.srsService.calculateNextInterval(
      newStage as any,
      perceivedDifficulty,
    );

    const nextReviewAt =
      nextInterval > 0 ? new Date(Date.now() + nextInterval) : null;

    return { newProgress, newStage, nextReviewAt };
  }

  /**
   * Рассчитывает воспринимаемую сложность на основе результата и времени ответа
   */
  private calculatePerceivedDifficulty(
    isCorrect: boolean,
    responseTimeMs: number,
    currentProgress: SrsProgress | null,
  ): number {
    // Базовая сложность
    let difficulty = 2; // средняя сложность

    if (!isCorrect) {
      difficulty = 3; // сложно
    } else {
      // Для правильных ответов определяем сложность по времени
      if (responseTimeMs < 2000) {
        difficulty = 1; // легко
      } else if (responseTimeMs < 5000) {
        difficulty = 2; // средне
      } else {
        difficulty = 3; // сложно
      }
    }

    // Учитываем предыдущие ошибки
    if (
      currentProgress?.incorrectAttempts &&
      currentProgress.incorrectAttempts > 0
    ) {
      difficulty = Math.min(4, difficulty + 1);
    }

    return difficulty;
  }

  /**
   * Генерирует задачи на значение кандзи
   */
  private generateMeaningTask(
    symbols: KanjiLessonSymbolWithProgress[],
    availableSymbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Используем основное значение как правильный ответ
    const correctMeaning = symbol.meaning;

    // Генерируем варианты ответов
    const options = this.generateMeaningOptions(
      correctMeaning,
      availableSymbols,
      4,
    );

    return {
      id: 0,
      taskType: 'kanji-meaning',
      symbols,
      question: `Каково значение иероглифа ${symbol.char}?`,
      options,
      correctAnswer: correctMeaning,
    };
  }

  /**
   * Генерирует задачи на чтение кандзи
   */
  private generateReadingTask(
    symbols: KanjiLessonSymbolWithProgress[],
    availableSymbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Используем только первое чтение (основное) как правильный ответ
    const correctReading =
      symbol.on.length > 0
        ? symbol.on[0]
        : symbol.kun.length > 0
          ? symbol.kun[0]
          : '';

    // Генерируем варианты ответов, исключая все чтения текущего символа
    const options = this.generateReadingOptionsExcludingSymbol(
      correctReading,
      symbol,
      availableSymbols,
      4,
    );

    return {
      id: 0,
      taskType: 'kanji-reading',
      symbols,
      question: `Как читается иероглиф ${symbol.char}?`,
      options,
      correctAnswer: correctReading,
    };
  }

  /**
   * Генерирует задачи на написание кандзи (ввод чтения)
   */
  private generateWritingTask(
    symbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Используем первое доступное чтение как правильный ответ
    const correctReading =
      symbol.on.length > 0
        ? symbol.on[0]
        : symbol.kun.length > 0
          ? symbol.kun[0]
          : '';

    return {
      id: 0,
      taskType: 'kanji-writing',
      symbols,
      question: `Введите ромадзи для иероглифа ${symbol.char}`,
      correctAnswer: correctReading, // Чтение, а не символ!
      config: {
        inputMode: 'romaji',
        symbol: symbol.char,
      },
    };
  }

  /**
   * Генерирует задачи на порядок написания кандзи
   */
  private generateStrokeOrderTask(
    symbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    const config = this.generateStrokeOrderConfig(symbol);

    return {
      id: 0,
      taskType: 'kanji-stroke-order',
      symbols: [symbol],
      question: `Нарисуйте иероглиф ${symbol.char} в правильном порядке`,
      correctAnswer: symbol.char,
      config,
    };
  }

  /**
   * Генерирует задачи на аудирование кандзи
   */
  private generateAudioTask(
    symbols: KanjiLessonSymbolWithProgress[],
    availableSymbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Используем первое доступное чтение как правильный ответ
    const correctReading =
      symbol.on.length > 0
        ? symbol.on[0]
        : symbol.kun.length > 0
          ? symbol.kun[0]
          : '';

    // Генерируем варианты ответов, исключая все чтения текущего символа
    const options = this.generateReadingOptionsExcludingSymbol(
      correctReading,
      symbol,
      availableSymbols,
      4,
    );

    const audioUrl = `/api/audio/kanji/${symbol.id}.mp3`;

    return {
      id: 0,
      taskType: 'kanji-audio',
      symbols,
      question: 'Прослушайте аудио и выберите правильное чтение',
      options,
      correctAnswer: correctReading,
      config: {
        audioUrl,
      },
    };
  }

  /**
   * Генерирует задачи-флешкарты
   */
  private generateFlashcardTask(
    symbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    const front = symbol.char;
    const back = `${symbol.meaning} (${symbol.on.length > 0 ? symbol.on[0] : symbol.kun.length > 0 ? symbol.kun[0] : ''})`;

    return {
      id: 0,
      taskType: 'flashcard',
      symbols,
      question: `Что означает иероглиф ${symbol.char}?`,
      correctAnswer: back,
      config: {
        front,
        back,
      },
    };
  }

  /**
   * Генерирует варианты ответов значений
   */
  private generateMeaningOptions(
    correctMeaning: string,
    allSymbols: KanjiLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>([correctMeaning]);

    // Собираем основные значения из всех символов
    const mainMeanings: string[] = [];
    allSymbols.forEach((symbol) => {
      if (symbol.meaning && symbol.meaning !== correctMeaning) {
        mainMeanings.push(symbol.meaning);
      }
    });

    // Перемешиваем и добавляем уникальные значения
    const shuffledMeanings = this.shuffleArray([...mainMeanings]);

    for (const meaning of shuffledMeanings) {
      if (options.size >= count) break;
      options.add(meaning);
    }

    // Если не хватает вариантов, добавляем из пула
    const meaningPool = [
      'один',
      'два',
      'три',
      'четыре',
      'пять',
      'человек',
      'вода',
      'огонь',
      'дерево',
      'земля',
      'день',
      'месяц',
      'год',
      'время',
      'жизнь',
      'рука',
      'нога',
      'глаз',
      'рот',
      'нос',
      'большой',
      'маленький',
      'новый',
      'старый',
      'хороший',
    ];

    const shuffledPool = this.shuffleArray([...meaningPool]);
    for (const meaning of shuffledPool) {
      if (options.size >= count) break;
      if (meaning !== correctMeaning) {
        options.add(meaning);
      }
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  /**
   * Генерирует варианты ответов, исключая все чтения указанного символа
   */
  private generateReadingOptionsExcludingSymbol(
    correctReading: string,
    excludeSymbol: KanjiLessonSymbolWithProgress,
    allSymbols: KanjiLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>([correctReading]);

    // Получаем все чтения исключаемого символа
    const excludeReadings = new Set([
      ...excludeSymbol.on,
      ...excludeSymbol.kun,
    ]);

    // Собираем чтения из других символов
    const otherReadings: string[] = [];
    allSymbols.forEach((symbol) => {
      if (symbol.id !== excludeSymbol.id) {
        // Добавляем первые чтения из других символов
        if (symbol.on.length > 0 && !excludeReadings.has(symbol.on[0])) {
          otherReadings.push(symbol.on[0]);
        }
        if (symbol.kun.length > 0 && !excludeReadings.has(symbol.kun[0])) {
          otherReadings.push(symbol.kun[0]);
        }
      }
    });

    // Перемешиваем и добавляем уникальные чтения
    const shuffledReadings = this.shuffleArray([...otherReadings]);

    for (const reading of shuffledReadings) {
      if (options.size >= count) break;
      if (reading !== correctReading && !excludeReadings.has(reading)) {
        options.add(reading);
      }
    }

    // Если не хватает вариантов, добавляем из общего пула
    if (options.size < count) {
      const readingPool = [
        'いち',
        'に',
        'さん',
        'し',
        'ご',
        'ろく',
        'しち',
        'はち',
        'きゅう',
        'じゅう',
        'じん',
        'にん',
        'ひと',
        'ふた',
        'み',
        'よ',
        'む',
        'なな',
        'は',
        'く',
        'ひ',
        'ふ',
        'みず',
        'か',
        'き',
        'く',
        'け',
        'こ',
        'さ',
        'す',
        'せ',
        'そ',
        'が',
        'ぎ',
        'ぐ',
        'げ',
        'ご',
        'ざ',
        'じ',
        'ず',
        'ぜ',
        'ぞ',
      ];

      const shuffledPool = this.shuffleArray([...readingPool]);
      for (const reading of shuffledPool) {
        if (options.size >= count) break;
        if (reading !== correctReading && !excludeReadings.has(reading)) {
          options.add(reading);
        }
      }
    }

    // Преобразуем в массив и перемешиваем
    const result = Array.from(options);
    return this.shuffleArray(result).slice(0, count);
  }

  /**
   * Генерирует конфиг для задачи kanji-stroke-order
   */
  private generateStrokeOrderConfig(
    symbol: KanjiLessonSymbolWithProgress,
  ): Record<string, any> {
    const config: Record<string, any> = {
      symbol: symbol.char,
    };

    const progress = symbol.progress;

    if (progress > 30 && Math.random() > 0.7) {
      config.hideTemplate = true;
    }

    if (progress > 50 && Math.random() > 0.6) {
      const initialStrokes = Math.floor(Math.random() * 3) + 1;
      config.initialStrokes = initialStrokes;
    }

    if (progress >= 90) {
      if (config.hideTemplate || config.initialStrokes) {
        config.errorThreshold = Math.floor(Math.random() * 3) + 4;
      }
    }

    if (progress === 100 && Math.random() > 0.8) {
      config.showHints = true;
    }

    return config;
  }

  /**
   * Выбирает тип задачи с учетом прогресса пользователя
   */
  private selectTaskTypeWithProgressAwareness(
    includeWriting: boolean,
    includeAudio: boolean,
    includeMeaning: boolean,
    includeReading: boolean,
    includeStrokeOrder: boolean,
    symbolsWithProgress: KanjiLessonSymbolWithProgress[],
  ): string {
    const avgProgress =
      symbolsWithProgress.length > 0
        ? symbolsWithProgress.reduce(
            (sum, symbol) => sum + symbol.progress,
            0,
          ) / symbolsWithProgress.length
        : 0;

    let audioProbability = 0.2;
    let meaningProbability = 0.25;
    let readingProbability = 0.2;
    let strokeOrderProbability = 0.15;
    let writingProbability = 0.15;
    let flashcardProbability = 0.05;

    if (avgProgress >= 40) {
      audioProbability = 0.15;
      meaningProbability = 0.2;
      readingProbability = 0.25;
      strokeOrderProbability = 0.15;
      writingProbability = 0.2;
      flashcardProbability = 0.05;
    }

    const probabilities = [
      { type: 'kanji-audio', probability: audioProbability },
      { type: 'kanji-meaning', probability: meaningProbability },
      { type: 'kanji-reading', probability: readingProbability },
      { type: 'kanji-writing', probability: writingProbability },
      { type: 'kanji-stroke-order', probability: strokeOrderProbability },
      { type: 'flashcard', probability: flashcardProbability },
    ];

    const random = Math.random();
    let cumulativeProbability = 0;

    for (const prob of probabilities) {
      cumulativeProbability += prob.probability;

      let canUse = true;
      switch (prob.type) {
        case 'kanji-audio':
          canUse = includeAudio;
          break;
        case 'kanji-meaning':
          canUse = includeMeaning;
          break;
        case 'kanji-reading':
          canUse = includeReading;
          break;
        case 'kanji-writing':
          canUse = includeWriting;
          break;
        case 'kanji-stroke-order':
          canUse = includeStrokeOrder;
          break;
      }

      if (canUse && random < cumulativeProbability) {
        return prob.type;
      }
    }

    return 'flashcard';
  }

  /**
   * Определяет количество задач в уроке
   */
  private determineTaskCount(symbolCount: number): number {
    if (symbolCount <= 3) return 12;
    if (symbolCount <= 5) return 18;
    if (symbolCount <= 8) return 20;
    return 22;
  }

  /**
   * Оценивает продолжительность урока
   */
  private estimateLessonDuration(tasks: KanjiLessonTask[]): number {
    let totalSeconds = 0;

    tasks.forEach((task) => {
      switch (task.taskType) {
        case 'kanji-meaning':
        case 'kanji-reading':
        case 'flashcard':
          totalSeconds += 25;
          break;
        case 'kanji-writing':
          totalSeconds += 40;
          break;
        case 'kanji-stroke-order':
          totalSeconds += 50;
          break;
        case 'kanji-audio':
          totalSeconds += 30;
          break;
        default:
          totalSeconds += 30;
      }
    });

    return Math.round(totalSeconds / 60);
  }

  /**
   * Возвращает случайный элемент из массива
   */
  private getRandomElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot get random element from empty array');
    }
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Перемешивает массив по алгоритму Фишера-Йетса и возвращает новый массив
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Генерирует уникальный ID для задачи
   */
  private generateTaskId(): number {
    return this.taskIdCounter++;
  }
}
