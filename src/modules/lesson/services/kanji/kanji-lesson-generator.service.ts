// src/kanji/service/kanji-lesson-generator.service.ts

import { Injectable } from '@nestjs/common';
import { SrsProgress, SrsService } from '@/services/srs.service';
import {
  KanjiLessonSymbol,
  KanjiLessonSymbolWithProgress,
  KanjiLessonTask,
  GeneratedKanjiLesson,
  KanjiLessonGenerationConfig,
} from '../../../kanji/interfaces';

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
    const { includeStrokeOrderTasks = true, completedTaskTypes = {} } = config;

    const tasks: KanjiLessonTask[] = [];

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

    // Разделяем символы на новые (без прогресса) и изученные (с прогрессом)
    const newSymbols = symbolsWithProgress.filter((s) => s.progress === 0);
    const learnedSymbolsFiltered = learnedSymbolsWithProgress.filter(
      (s) => s.progress > 0,
    );

    // Для НОВЫХ символов: детальная карточка + задачи только по этому символу
    for (const symbol of newSymbols) {
      if (tasks.length >= taskCount) break;

      // 1. Детальная карточка по новому символу
      tasks.push(this.generateDetailInfoTask([symbol], tasks));

      // 2. Задачи только по этому символу
      const symbolTasks = this.generateTasksForNewSymbol(
        symbol,
        allSymbolsWithProgress,
        includeStrokeOrderTasks,
        4, // максимум 4 задачи на новый символ
      );

      symbolTasks.forEach((task) => {
        if (tasks.length < taskCount) {
          tasks.push(task);
        }
      });
    }

    // Для ИЗУЧЕННЫХ символов: задачи в разнобой
    while (tasks.length < taskCount && learnedSymbolsFiltered.length > 0) {
      const randomSymbol = this.getRandomElement(learnedSymbolsFiltered);
      const taskType = this.selectTaskType();

      let task: KanjiLessonTask | null = null;

      switch (taskType) {
        case 'kanji-meaning':
          task = this.generateMeaningTask(
            [randomSymbol],
            allSymbolsWithProgress,
            tasks,
          );
          break;
        case 'kanji-reading':
          task = this.generateReadingTask(
            [randomSymbol],
            allSymbolsWithProgress,
            tasks,
          );
          break;
        case 'stroke-order':
          if (includeStrokeOrderTasks) {
            task = this.generateStrokeOrderTask([randomSymbol], tasks);
          }
          break;
        case 'kanji-reading-multiple':
          task = this.generateMultipleReadingTask(
            [randomSymbol],
            allSymbolsWithProgress,
            tasks,
          );
          break;
      }

      if (task && !this.isDuplicateTask(task, tasks)) {
        tasks.push(task);
      }
    }

    // Если не хватает задач и новых символов нет, генерируем задачи по всем символам
    if (tasks.length < taskCount) {
      const allSymbols = [
        ...symbolsWithProgress,
        ...learnedSymbolsWithProgress,
      ];
      while (tasks.length < taskCount && allSymbols.length > 0) {
        const randomSymbol = this.getRandomElement(allSymbols);
        const taskType = this.selectTaskType();

        let task: KanjiLessonTask | null = null;

        switch (taskType) {
          case 'kanji-meaning':
            task = this.generateMeaningTask(
              [randomSymbol],
              allSymbolsWithProgress,
              tasks,
            );
            break;
          case 'kanji-reading':
            task = this.generateReadingTask(
              [randomSymbol],
              allSymbolsWithProgress,
              tasks,
            );
            break;
          case 'stroke-order':
            if (includeStrokeOrderTasks) {
              task = this.generateStrokeOrderTask([randomSymbol], tasks);
            }
            break;
          case 'kanji-reading-multiple':
            task = this.generateMultipleReadingTask(
              [randomSymbol],
              allSymbolsWithProgress,
              tasks,
            );
            break;
        }

        if (task && !this.isDuplicateTask(task, tasks)) {
          tasks.push(task);
        }
      }
    }

    // Назначаем ID
    tasks.forEach((task) => {
      task.id = this.generateTaskId();
    });

    return {
      lessonId: Date.now(),
      title: 'Урок кандзи',
      description: `Изучение ${symbolsToLearn.length} иероглифов`,
      tasks: tasks.slice(0, taskCount),
      estimatedDuration: this.estimateLessonDuration(tasks.slice(0, taskCount)),
    };
  }

  /**
   * Генерирует задачи для нового символа (только по этому символу)
   */
  private generateTasksForNewSymbol(
    symbol: KanjiLessonSymbolWithProgress,
    allSymbols: KanjiLessonSymbolWithProgress[],
    includeStrokeOrder: boolean,
    maxTasks: number,
  ): KanjiLessonTask[] {
    const tasks: KanjiLessonTask[] = [];
    const taskTypes = [
      'kanji-meaning',
      'kanji-reading',
      'kanji-reading-multiple',
    ];

    if (includeStrokeOrder) {
      taskTypes.push('stroke-order');
    }

    // Генерируем задачи только по текущему символу
    for (let i = 0; i < maxTasks && taskTypes.length > 0; i++) {
      const availableTaskTypes = [...taskTypes];
      const taskType = this.getRandomElement(availableTaskTypes);

      let task: KanjiLessonTask | null = null;

      switch (taskType) {
        case 'kanji-meaning':
          task = this.generateMeaningTask([symbol], allSymbols, tasks);
          break;
        case 'kanji-reading':
          task = this.generateReadingTask([symbol], allSymbols, tasks);
          break;
        case 'stroke-order':
          task = this.generateStrokeOrderTask([symbol], tasks);
          break;
        case 'kanji-reading-multiple':
          task = this.generateMultipleReadingTask([symbol], allSymbols, tasks);
          break;
      }

      if (task && !this.isDuplicateTask(task, tasks)) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Генерирует карточку детальной информации о кандзи
   */
  private generateDetailInfoTask(
    symbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    return {
      id: 0,
      taskType: 'kanji-detail-info',
      symbols,
      question: `Изучите иероглиф ${symbol.char}`,
      correctAnswer: symbol.char,
      config: {
        char: symbol.char,
        on: symbol.on,
        kun: symbol.kun,
        meaning: symbol.meaning,
        level: symbol.level,
      },
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
   * Выбирает тип задачи
   */
  private selectTaskType(): string {
    const taskTypes = [
      'kanji-meaning', // Чтения и значение -> выбор из 4 кандзи
      'kanji-reading', // Кандзи -> выбор из значений
      'stroke-order', // Задача на начертание
      'kanji-reading-multiple', // Кандзи -> множественный выбор чтений
    ];

    return this.getRandomElement(taskTypes);
  }

  /**
   * Генерирует задачу: чтения и значение -> выбор из 4 кандзи
   */
  private generateMeaningTask(
    symbols: KanjiLessonSymbolWithProgress[],
    availableSymbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Генерируем варианты ответов (4 кандзи)
    const options = this.generateKanjiOptions(symbol.char, availableSymbols, 4);

    return {
      id: 0,
      taskType: 'kanji-meaning',
      symbols,
      question: `Какой иероглиф соответствует: ${symbol.meaning}?`,
      options,
      correctAnswer: symbol.char,
      config: {
        hideSymbol: true, // Скрываем символ
        hideOnReading: false, // Показываем он чтения
        hideKunReading: false, // Показываем кун чтения
      },
    };
  }

  /**
   * Генерирует задачу: кандзи -> выбор из значений
   */
  private generateReadingTask(
    symbols: KanjiLessonSymbolWithProgress[],
    availableSymbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Генерируем варианты ответов (значения)
    const options = this.generateMeaningOptions(
      symbol.meaning,
      availableSymbols,
      4,
    );

    return {
      id: 0,
      taskType: 'kanji-reading',
      symbols,
      question: `Что означает иероглиф ${symbol.char}?`,
      options,
      correctAnswer: symbol.meaning,
    };
  }

  /**
   * Генерирует варианты ответов для всех чтений (множественный выбор) с типами
   */
  private generateAllReadingOptionsWithTypes(
    correctReadings: Array<{ reading: string; type: 'on' | 'kun' }>,
    allSymbols: KanjiLessonSymbolWithProgress[],
    count: number,
  ): Array<{ reading: string; type: 'on' | 'kun' }> {
    const options = new Map<string, { reading: string; type: 'on' | 'kun' }>();

    // Добавляем правильные ответы
    correctReadings.forEach((item) => {
      options.set(item.reading, item);
    });

    // Собираем чтения из других символов
    const otherReadings: Array<{ reading: string; type: 'on' | 'kun' }> = [];
    allSymbols.forEach((symbol) => {
      symbol.on.forEach((reading) =>
        otherReadings.push({ reading, type: 'on' }),
      );
      symbol.kun.forEach((reading) =>
        otherReadings.push({ reading, type: 'kun' }),
      );
    });

    // Перемешиваем и добавляем уникальные чтения
    const shuffledReadings = this.shuffleArray([...otherReadings]);

    for (const readingItem of shuffledReadings) {
      if (options.size >= count) break;
      if (!correctReadings.some((cr) => cr.reading === readingItem.reading)) {
        options.set(readingItem.reading, readingItem);
      }
    }

    // Если не хватает вариантов, добавляем из общего пула
    if (options.size < count) {
      const readingPool = [
        { reading: 'いち', type: 'on' as const },
        { reading: 'に', type: 'on' as const },
        { reading: 'さん', type: 'on' as const },
        { reading: 'し', type: 'on' as const },
        { reading: 'ご', type: 'on' as const },
        { reading: 'ろく', type: 'on' as const },
        { reading: 'しち', type: 'on' as const },
        { reading: 'はち', type: 'on' as const },
        { reading: 'きゅう', type: 'on' as const },
        { reading: 'じゅう', type: 'on' as const },
        { reading: 'ひと', type: 'kun' as const },
        { reading: 'ふた', type: 'kun' as const },
        { reading: 'み', type: 'kun' as const },
        { reading: 'よ', type: 'kun' as const },
        { reading: 'いつ', type: 'kun' as const },
        { reading: 'む', type: 'kun' as const },
        { reading: 'なな', type: 'kun' as const },
        { reading: 'や', type: 'kun' as const },
        { reading: 'ここの', type: 'kun' as const },
        { reading: 'とお', type: 'kun' as const },
      ];

      const shuffledPool = this.shuffleArray([...readingPool]);
      for (const readingItem of shuffledPool) {
        if (options.size >= count) break;
        if (!correctReadings.some((cr) => cr.reading === readingItem.reading)) {
          options.set(readingItem.reading, readingItem);
        }
      }
    }

    return Array.from(options.values()).sort(() => Math.random() - 0.5);
  }

  /**
   * Генерирует задачу: кандзи -> множественный выбор чтений
   */
  private generateMultipleReadingTask(
    symbols: KanjiLessonSymbolWithProgress[],
    availableSymbols: KanjiLessonSymbolWithProgress[],
    existingTasks: KanjiLessonTask[],
  ): KanjiLessonTask {
    const symbol = symbols[0];

    // Все чтения символа с типами
    const allReadings: { reading: string; type: 'on' | 'kun' }[] = [
      ...symbol.on.map((reading) => ({ reading, type: 'on' as const })),
      ...symbol.kun.map((reading) => ({ reading, type: 'kun' as const })),
    ];

    // Генерируем варианты ответов (все чтения + ложные варианты)
    const options = this.generateAllReadingOptionsWithTypes(
      allReadings,
      availableSymbols,
      6, // Больше вариантов для множественного выбора
    );

    return {
      id: 0,
      taskType: 'kanji-reading-multiple',
      symbols,
      question: `Выберите все чтения иероглифа ${symbol.char}:`,
      options, // Массив объектов { reading: string, type: 'on' | 'kun' }
      correctAnswer: allReadings.map((item) => item.reading), // Массив строк - как и было
      config: {
        multipleSelect: true, // Флаг для множественного выбора
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
      taskType: 'stroke-order',
      symbols: [symbol],
      question: `Нарисуйте иероглиф ${symbol.char} в правильном порядке`,
      correctAnswer: symbol.char,
      config,
    };
  }

  /**
   * Генерирует варианты ответов кандзи
   */
  private generateKanjiOptions(
    correctKanji: string,
    allSymbols: KanjiLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>([correctKanji]);

    // Собираем другие кандзи
    const otherKanji: string[] = [];
    allSymbols.forEach((symbol) => {
      if (symbol.char && symbol.char !== correctKanji) {
        otherKanji.push(symbol.char);
      }
    });

    // Перемешиваем и добавляем уникальные значения
    const shuffledKanji = this.shuffleArray([...otherKanji]);

    for (const kanji of shuffledKanji) {
      if (options.size >= count) break;
      options.add(kanji);
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
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
      'плохой',
      'много',
      'мало',
      'быстрый',
      'медленный',
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
   * Генерирует варианты ответов для всех чтений (множественный выбор)
   */
  private generateAllReadingOptions(
    correctReadings: string[],
    allSymbols: KanjiLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>(correctReadings);

    // Собираем чтения из других символов
    const otherReadings: string[] = [];
    allSymbols.forEach((symbol) => {
      otherReadings.push(...symbol.on, ...symbol.kun);
    });

    // Перемешиваем и добавляем уникальные чтения
    const shuffledReadings = this.shuffleArray([...otherReadings]);

    for (const reading of shuffledReadings) {
      if (options.size >= count) break;
      if (!correctReadings.includes(reading)) {
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
        if (!correctReadings.includes(reading)) {
          options.add(reading);
        }
      }
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  /**
   * Генерирует конфиг для задачи stroke-order
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
        case 'kanji-detail-info': // Детальная информация
          totalSeconds += 30;
          break;
        case 'kanji-meaning':
        case 'kanji-reading':
          totalSeconds += 25;
          break;
        case 'kanji-reading-multiple':
          totalSeconds += 35;
          break;
        case 'stroke-order':
          totalSeconds += 50;
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
