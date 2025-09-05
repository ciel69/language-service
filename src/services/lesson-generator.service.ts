// src/lesson/service/lesson-generator.service.ts
import { Injectable } from '@nestjs/common';
import { KanaLessonSymbol } from '@/modules/kana/kana.service';
import { SrsService } from '@/services/srs.service';

export interface LessonTask {
  id: number;
  taskType: string;
  symbol?: KanaLessonSymbol;
  question: string;
  options?: (string | KanaLessonSymbol)[];
  correctAnswer?: string | string[];
  config?: Record<string, any>;
  combinations?: KanaLessonSymbol[];
}

export interface KanaLessonSymbolWithProgress extends KanaLessonSymbol {
  progress: number;
}

export interface GeneratedLesson {
  lessonId: number;
  title: string;
  description: string;
  tasks: LessonTask[];
  estimatedDuration: number;
}

export interface LessonGenerationConfig {
  includeWritingTasks?: boolean;
  includeAudioTasks?: boolean;
  includeCombinationTasks?: boolean;
  includeStrokeOrderTasks?: boolean;
  includePairingTasks?: boolean;
  includeReverseRecognition?: boolean;
  combinationDifficulty?: 'easy' | 'medium' | 'hard';
  symbolProgress?: Record<number, number>;
}

@Injectable()
export class LessonGeneratorService {
  private taskIdCounter = 1;

  constructor(private readonly srsService: SrsService) {}

  /**
   * Генерирует урок на основе символов, которые нужно изучить/повторить
   */
  async generateKanaLesson(
    symbolsToLearn: KanaLessonSymbol[],
    learnedSymbols: KanaLessonSymbol[],
    config: LessonGenerationConfig = {},
  ): Promise<GeneratedLesson> {
    const {
      includeWritingTasks = true,
      includeAudioTasks = true,
      includeCombinationTasks = true,
      includeStrokeOrderTasks = true,
      includePairingTasks = true,
      includeReverseRecognition = true,
      combinationDifficulty = 'medium',
      symbolProgress = {},
    } = config;

    const tasks: LessonTask[] = [];
    const availableSymbols = [...symbolsToLearn, ...learnedSymbols];

    // Добавляем прогресс к символам
    const symbolsWithProgress: KanaLessonSymbolWithProgress[] =
      symbolsToLearn.map((symbol) => ({
        ...symbol,
        progress: symbolProgress[symbol.id] || 0,
      }));

    const learnedSymbolsWithProgress: KanaLessonSymbolWithProgress[] =
      learnedSymbols.map((symbol) => ({
        ...symbol,
        progress: symbolProgress[symbol.id] || 80,
      }));

    const allSymbolsWithProgress = [
      ...symbolsWithProgress,
      ...learnedSymbolsWithProgress,
    ];

    // Определяем количество задач
    const taskCount = this.determineTaskCount(symbolsToLearn.length);

    // Создаем ПРИОРИТЕТНЫЕ задачи для новых символов (в правильном порядке)
    for (const symbol of symbolsWithProgress) {
      const isNewSymbol = symbol.progress < 10;

      // Для НОВЫХ символов: первыми всегда аудирование, распознавание, обратное распознавание
      if (isNewSymbol) {
        // 1. Аудирование (обязательно первая задача для новых символов)
        if (includeAudioTasks) {
          tasks.push(this.generateAudioTask([symbol], allSymbolsWithProgress));
        }

        // 2. Распознавание (визуальное)
        tasks.push(
          this.generateRecognitionTask([symbol], allSymbolsWithProgress),
        );

        // 3. Обратное распознавание (ромадзи -> символ)
        if (includeReverseRecognition) {
          tasks.push(
            this.generateReverseRecognitionTask(
              [symbol],
              allSymbolsWithProgress,
            ),
          );
        }

        // 4. Запись ромадзи
        if (includeWritingTasks) {
          tasks.push(this.generateWritingTask(symbol));
        }

        // 5. Stroke-order (последним для новых символов)
        if (includeStrokeOrderTasks) {
          tasks.push(this.generateStrokeOrderTask(symbol));
        }
      } else {
        // Для УСТАНОВИВШИХСЯ символов: обычный порядок
        if (includeAudioTasks) {
          tasks.push(this.generateAudioTask([symbol], allSymbolsWithProgress));
        }

        tasks.push(
          this.generateRecognitionTask([symbol], allSymbolsWithProgress),
        );

        if (includeReverseRecognition) {
          tasks.push(
            this.generateReverseRecognitionTask(
              [symbol],
              allSymbolsWithProgress,
            ),
          );
        }

        if (includeWritingTasks) {
          tasks.push(this.generateWritingTask(symbol));
        }

        if (includeStrokeOrderTasks) {
          tasks.push(this.generateStrokeOrderTask(symbol));
        }
      }
    }

    // Добавляем комбинированные задачи (только для символов с прогрессом >= 30%)
    const symbolsReadyForCombination = symbolsWithProgress.filter(
      (symbol) => symbol.progress >= 30,
    );

    if (
      includeCombinationTasks &&
      learnedSymbolsWithProgress.length > 0 &&
      symbolsReadyForCombination.length > 0
    ) {
      const combinationCount = Math.min(4, Math.floor(taskCount * 0.25));
      for (let i = 0; i < combinationCount; i++) {
        const task = this.generateCombinationTask(
          symbolsReadyForCombination, // Только символы с прогрессом >= 40%
          allSymbolsWithProgress,
          combinationDifficulty,
          symbolProgress,
        );
        if (task) tasks.push(task);
      }
    }

    // Добавляем pairing задачи
    if (includePairingTasks) {
      const pairingCount = Math.min(2, Math.floor(taskCount * 0.15));
      for (let i = 0; i < pairingCount; i++) {
        const task = this.generatePairingTask(
          symbolsWithProgress,
          allSymbolsWithProgress,
        );
        if (task) tasks.push(task);
      }
    }

    // Добавляем дополнительные задачи до нужного количества
    while (tasks.length < taskCount) {
      const taskType = this.selectTaskTypeWithProgressAwareness(
        includeWritingTasks,
        includeAudioTasks,
        includeCombinationTasks,
        includeStrokeOrderTasks,
        includePairingTasks,
        includeReverseRecognition,
        symbolsWithProgress,
      );

      let task: LessonTask | null = null;
      const randomSymbol = this.getRandomElement(symbolsWithProgress);

      switch (taskType) {
        case 'kana-recognition':
          task = this.generateRecognitionTask(
            [randomSymbol],
            allSymbolsWithProgress,
          );
          break;
        case 'kana-reverse-recognition':
          if (includeReverseRecognition) {
            task = this.generateReverseRecognitionTask(
              [randomSymbol],
              allSymbolsWithProgress,
            );
          }
          break;
        case 'kana-writing':
          if (includeWritingTasks) {
            task = this.generateWritingTask(randomSymbol);
          }
          break;
        case 'kana-stroke-order':
          // Не создаем stroke-order задачи для символов с прогрессом < 10%
          if (includeStrokeOrderTasks && randomSymbol.progress >= 10) {
            task = this.generateStrokeOrderTask(randomSymbol);
          }
          break;
        case 'kana-audio':
          task = this.generateAudioTask([randomSymbol], allSymbolsWithProgress);
          break;
        case 'kana-combination':
          // Только для символов с прогрессом >= 40%
          const combinationReadySymbols = symbolsWithProgress.filter(
            (s) => s.progress >= 40,
          );
          if (
            includeCombinationTasks &&
            learnedSymbolsWithProgress.length > 0 &&
            combinationReadySymbols.length > 0
          ) {
            const symbolForCombination = this.getRandomElement(
              combinationReadySymbols,
            );
            task = this.generateCombinationTask(
              [symbolForCombination],
              allSymbolsWithProgress,
              combinationDifficulty,
              symbolProgress,
            );
          }
          break;
        case 'pairing':
          if (includePairingTasks) {
            task = this.generatePairingTask(
              symbolsWithProgress,
              allSymbolsWithProgress,
            );
          }
          break;
        case 'flashcard':
          task = this.generateFlashcardTask([randomSymbol]);
          break;
      }

      if (task) {
        tasks.push(task);
      }
    }

    // Перемешиваем задачи с умным чередованием
    const shuffledTasks = this.smartShuffleWithPriority(
      tasks,
      symbolsWithProgress,
    );

    // Назначаем ID
    shuffledTasks.forEach((task, index) => {
      task.id = this.generateTaskId();
    });

    return {
      lessonId: Date.now(),
      title: 'Урок хираганы',
      description: `Изучение ${symbolsToLearn.length} символов`,
      tasks: shuffledTasks.slice(0, taskCount),
      estimatedDuration: this.estimateLessonDuration(
        shuffledTasks.slice(0, taskCount),
      ),
    };
  }

  /**
   * Умное перемешивание с приоритетом для новых символов
   */
  private smartShuffleWithPriority(
    tasks: LessonTask[],
    symbolsToLearn: KanaLessonSymbolWithProgress[],
  ): LessonTask[] {
    // Разделяем задачи на группы
    const newSymbolTasks: LessonTask[] = []; // Задачи для новых символов (в правильном порядке)
    const establishedSymbolTasks: LessonTask[] = []; // Задачи для остальных символов
    const otherTasks: LessonTask[] = []; // Комбинации, pairing и т.д.

    // Группируем задачи по символам
    const tasksBySymbol: Record<number, LessonTask[]> = {};

    tasks.forEach((task) => {
      let symbolId = 0;
      if (task.symbol) {
        symbolId = task.symbol.id;
      } else if (task.combinations && task.combinations.length > 0) {
        symbolId = task.combinations[0].id;
      } else {
        otherTasks.push(task);
        return;
      }

      if (!tasksBySymbol[symbolId]) {
        tasksBySymbol[symbolId] = [];
      }
      tasksBySymbol[symbolId].push(task);
    });

    // Для новых символов сохраняем правильный порядок задач
    const newSymbols = symbolsToLearn.filter((s) => s.progress < 10);
    const establishedSymbols = symbolsToLearn.filter((s) => s.progress >= 10);

    // Добавляем задачи для новых символов в правильной последовательности
    for (const symbol of newSymbols) {
      const symbolTasks = tasksBySymbol[symbol.id] || [];
      // Порядок: аудио -> распознавание -> обратное распознавание -> запись -> stroke-order -> остальные
      const orderedTasks = [
        ...symbolTasks.filter((t) => t.taskType === 'kana-audio'),
        ...symbolTasks.filter((t) => t.taskType === 'kana-recognition'),
        ...symbolTasks.filter((t) => t.taskType === 'kana-reverse-recognition'),
        ...symbolTasks.filter((t) => t.taskType === 'kana-writing'),
        ...symbolTasks.filter((t) => t.taskType === 'kana-stroke-order'),
        ...symbolTasks.filter(
          (t) =>
            t.taskType !== 'kana-audio' &&
            t.taskType !== 'kana-recognition' &&
            t.taskType !== 'kana-reverse-recognition' &&
            t.taskType !== 'kana-writing' &&
            t.taskType !== 'kana-stroke-order',
        ),
      ];
      newSymbolTasks.push(...orderedTasks);
    }

    // Добавляем задачи для установленных символов
    for (const symbol of establishedSymbols) {
      const symbolTasks = tasksBySymbol[symbol.id] || [];
      establishedSymbolTasks.push(...symbolTasks);
    }

    // Перемешиваем только задачи для установленных символов и остальные
    this.shuffleArray(establishedSymbolTasks);
    this.shuffleArray(otherTasks);

    // Комбинируем: новые символы (в порядке) + перемешанные остальные
    const result = [
      ...newSymbolTasks,
      ...establishedSymbolTasks,
      ...otherTasks,
    ];

    // Убеждаемся, что pairing задачи не идут подряд
    for (let i = 1; i < result.length; i++) {
      if (
        result[i].taskType === 'pairing' &&
        result[i - 1].taskType === 'pairing'
      ) {
        for (let j = i + 1; j < result.length; j++) {
          if (result[j].taskType !== 'pairing') {
            [result[i], result[j]] = [result[j], result[i]];
            break;
          }
        }
      }
    }

    return result;
  }

  private generateRecognitionTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const symbol = this.getRandomElement(symbolsToLearn);
    const options = this.generateRomajiOptions(symbol, availableSymbols, 4);

    return {
      id: 0,
      taskType: 'kana-recognition',
      symbol,
      question: `Какой ромадзи соответствует символу ${symbol.char}?`,
      options,
      correctAnswer: symbol.romaji,
    };
  }

  private generateReverseRecognitionTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const symbol = this.getRandomElement(symbolsToLearn);
    const options = this.generateSymbolOptions(symbol, availableSymbols, 4);

    return {
      id: 0,
      taskType: 'kana-reverse-recognition',
      symbol,
      question: `Какой символ соответствует ромадзи "${symbol.romaji}"?`,
      options,
      correctAnswer: symbol.char,
    };
  }

  private generateWritingTask(
    symbol: KanaLessonSymbolWithProgress,
  ): LessonTask {
    return {
      id: 0,
      taskType: 'kana-writing',
      symbol,
      question: `Введите ромадзи для символа ${symbol.char}`,
      correctAnswer: symbol.romaji,
      config: {
        inputMode: 'romaji',
      },
    };
  }

  private generateAudioTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const symbol = this.getRandomElement(symbolsToLearn);
    const options = this.generateRomajiOptions(symbol, availableSymbols, 4);

    return {
      id: 0,
      taskType: 'kana-audio',
      symbol,
      question: 'Прослушайте аудио и выберите правильный ромадзи',
      options,
      correctAnswer: symbol.romaji,
      config: {
        audioUrl: `/api/audio/kana/${symbol.id}.mp3`,
      },
    };
  }

  private generateStrokeOrderTask(
    symbol: KanaLessonSymbolWithProgress,
  ): LessonTask {
    return {
      id: 0,
      taskType: 'kana-stroke-order',
      symbol,
      question: `Нарисуйте символ ${symbol.char} в правильном порядке`,
      correctAnswer: symbol.char,
      config: {
        symbol: symbol.char,
      },
    };
  }

  private generateCombinationTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[], // Только символы готовые для комбинаций
    availableSymbols: KanaLessonSymbolWithProgress[],
    difficulty: 'easy' | 'medium' | 'hard',
    symbolProgress: Record<number, number>,
  ): LessonTask | null {
    if (availableSymbols.length < 2) return null;

    let firstSymbol: KanaLessonSymbolWithProgress;
    let secondSymbol: KanaLessonSymbolWithProgress;

    switch (difficulty) {
      case 'easy':
        // Оба символа из тех, что готовы для комбинаций
        firstSymbol = this.getRandomElement(symbolsToLearn);
        secondSymbol = this.getRandomElement(
          symbolsToLearn.filter((s) => s.id !== firstSymbol.id),
        );
        break;
      case 'medium':
        // Первый из готовых, второй может быть любой
        firstSymbol = this.getRandomElement(symbolsToLearn);
        secondSymbol = this.getRandomElement(
          availableSymbols.filter((s) => s.id !== firstSymbol.id),
        );
        break;
      case 'hard':
        // Первый из готовых, второй обязательно с высоким прогрессом
        firstSymbol = this.getRandomElement(symbolsToLearn);
        const highProgressSymbols = availableSymbols.filter(
          (s) => s.id !== firstSymbol.id && (symbolProgress[s.id] || 0) >= 60,
        );
        if (highProgressSymbols.length === 0) {
          // Если нет символов с высоким прогрессом, берем любые
          const otherSymbols = availableSymbols.filter(
            (s) => s.id !== firstSymbol.id,
          );
          if (otherSymbols.length === 0) return null;
          secondSymbol = this.getRandomElement(otherSymbols);
        } else {
          secondSymbol = this.getRandomElement(highProgressSymbols);
        }
        break;
      default:
        firstSymbol = this.getRandomElement(symbolsToLearn);
        secondSymbol = this.getRandomElement(
          availableSymbols.filter((s) => s.id !== firstSymbol.id),
        );
    }

    const combination = firstSymbol.char + secondSymbol.char;
    const options = this.generateCombinationOptions(
      combination,
      availableSymbols,
      4,
    );

    return {
      id: 0,
      taskType: 'kana-recognition',
      combinations: [firstSymbol, secondSymbol],
      question: `Найдите карточку ${combination}`,
      options,
      correctAnswer: combination,
    };
  }

  private generatePairingTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask | null {
    if (availableSymbols.length < 5) return null;

    const pairsCount = 5;
    const selectedSymbols = this.getRandomElements(
      availableSymbols,
      pairsCount,
    );

    const pairs = selectedSymbols.map((symbol) => ({
      symbol,
      romaji: symbol.romaji,
    }));

    const romajis = pairs.map((p) => p.romaji);
    this.shuffleArray(romajis);

    return {
      id: 0,
      taskType: 'pairing',
      question: 'Соедините символы с их ромадзи',
      options: romajis,
      correctAnswer: pairs.map((p) => p.romaji),
      config: {
        pairs: pairs.map((p) => ({
          char: p.symbol.char,
          romaji: p.romaji,
          id: p.symbol.id,
        })),
      },
    };
  }

  private generateFlashcardTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const symbol = this.getRandomElement(symbolsToLearn);

    return {
      id: 0,
      taskType: 'flashcard',
      symbol,
      question: `Что означает символ ${symbol.char}?`,
      correctAnswer: symbol.romaji,
      config: {
        front: symbol.char,
        back: symbol.romaji,
      },
    };
  }

  private generateRomajiOptions(
    correctSymbol: KanaLessonSymbolWithProgress,
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>([correctSymbol.romaji]);

    while (options.size < count && allSymbols.length >= count) {
      const randomSymbol = this.getRandomElement(allSymbols);
      if (randomSymbol.romaji !== correctSymbol.romaji) {
        options.add(randomSymbol.romaji);
      }
    }

    const romajiPool = [
      'a',
      'i',
      'u',
      'e',
      'o',
      'ka',
      'ki',
      'ku',
      'ke',
      'ko',
      'sa',
      'shi',
      'su',
      'se',
      'so',
      'ta',
      'chi',
      'tsu',
      'te',
      'to',
    ];
    while (options.size < count) {
      const randomRomaji = this.getRandomElement(romajiPool);
      options.add(randomRomaji);
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  private generateSymbolOptions(
    correctSymbol: KanaLessonSymbolWithProgress,
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
  ): KanaLessonSymbol[] {
    const options = new Set<KanaLessonSymbol>([correctSymbol]);

    while (options.size < count && allSymbols.length >= count) {
      const randomSymbol = this.getRandomElement(allSymbols);
      if (randomSymbol.id !== correctSymbol.id) {
        options.add(randomSymbol);
      }
    }

    // Если не хватает символов, добавляем из пула
    const symbolPool = allSymbols.filter((s) => s.id !== correctSymbol.id);
    while (options.size < count && symbolPool.length > 0) {
      const randomSymbol = this.getRandomElement(symbolPool);
      options.add(randomSymbol);
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  private generateCombinationOptions(
    correctCombination: string,
    availableSymbols: KanaLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>([correctCombination]);

    while (options.size < count) {
      const first = this.getRandomElement(availableSymbols);
      const second = this.getRandomElement(
        availableSymbols.filter((s) => s.id !== first.id),
      );
      const combination = first.char + second.char;
      options.add(combination);
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  private selectTaskTypeWithProgressAwareness(
    includeWriting: boolean,
    includeAudio: boolean,
    includeCombination: boolean,
    includeStrokeOrder: boolean,
    includePairing: boolean,
    includeReverseRecognition: boolean,
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
  ): string {
    // Рассчитываем средний прогресс символов
    const avgProgress =
      symbolsWithProgress.length > 0
        ? symbolsWithProgress.reduce(
            (sum, symbol) => sum + symbol.progress,
            0,
          ) / symbolsWithProgress.length
        : 0;

    // При высоком прогрессе увеличиваем вероятность комбинированных задач
    let audioProbability = 0.2;
    let recognitionProbability = 0.15;
    let reverseRecognitionProbability = 0.15;
    let combinationProbability = 0.15;
    let strokeOrderProbability = 0.1;

    if (avgProgress >= 40) {
      audioProbability = 0.15;
      recognitionProbability = 0.15;
      reverseRecognitionProbability = 0.15;
      combinationProbability = 0.2; // Увеличиваем вероятность комбинаций
      strokeOrderProbability = 0.15;
    }

    const random = Math.random();

    if (includeAudio && random < audioProbability) {
      return 'kana-audio';
    } else if (
      includeReverseRecognition &&
      random < audioProbability + reverseRecognitionProbability
    ) {
      return 'kana-reverse-recognition';
    } else if (
      random <
      audioProbability + reverseRecognitionProbability + recognitionProbability
    ) {
      return 'kana-recognition';
    } else if (
      includeCombination &&
      random <
        audioProbability +
          reverseRecognitionProbability +
          recognitionProbability +
          combinationProbability
    ) {
      return 'kana-combination';
    } else if (
      includeWriting &&
      random <
        audioProbability +
          reverseRecognitionProbability +
          recognitionProbability +
          combinationProbability +
          0.1
    ) {
      return 'kana-writing';
    } else if (
      includeStrokeOrder &&
      random <
        audioProbability +
          reverseRecognitionProbability +
          recognitionProbability +
          combinationProbability +
          0.1 +
          strokeOrderProbability
    ) {
      return 'kana-stroke-order';
    } else if (
      includePairing &&
      random <
        audioProbability +
          reverseRecognitionProbability +
          recognitionProbability +
          combinationProbability +
          0.1 +
          strokeOrderProbability +
          0.08
    ) {
      return 'pairing';
    } else {
      return 'flashcard';
    }
  }

  private determineTaskCount(symbolCount: number): number {
    if (symbolCount <= 3) return 12;
    if (symbolCount <= 5) return 18;
    if (symbolCount <= 8) return 20;
    return 22;
  }

  private estimateLessonDuration(tasks: LessonTask[]): number {
    let totalSeconds = 0;

    tasks.forEach((task) => {
      switch (task.taskType) {
        case 'kana-recognition':
        case 'kana-reverse-recognition':
        case 'flashcard':
          totalSeconds += 20;
          break;
        case 'kana-writing':
          totalSeconds += 35;
          break;
        case 'kana-stroke-order':
          totalSeconds += 45;
          break;
        case 'kana-audio':
          totalSeconds += 25;
          break;
        case 'kana-combination':
          totalSeconds += 40;
          break;
        case 'pairing':
          totalSeconds += 60;
          break;
        default:
          totalSeconds += 30;
      }
    });

    return Math.round(totalSeconds / 60);
  }

  private getRandomElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot get random element from empty array');
    }
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomElements<T>(array: T[], count: number): T[] {
    if (array.length === 0) return [];
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private generateTaskId(): number {
    return this.taskIdCounter++;
  }
}
