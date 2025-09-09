// src/lesson/service/lesson-generator.service.ts
import { Injectable } from '@nestjs/common';
import { KanaLessonSymbol } from '@/modules/kana/kana.service';
import { SrsService } from '@/services/srs.service';

export interface LessonTask {
  id: number;
  taskType: string;
  symbols?: KanaLessonSymbol[]; // УНИФИЦИРОВАННЫЙ интерфейс для всех задач
  question: string;
  options?: (string | KanaLessonSymbol)[];
  correctAnswer?: string | string[];
  config?: Record<string, any>;
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
  includeStrokeOrderTasks?: boolean;
  includePairingTasks?: boolean;
  includeReverseRecognition?: boolean;
  includeCombinations?: boolean; // Новое: использовать комбинации символов
  symbolProgress?: Record<number, number>;
  maxCombinationLength?: number; // Максимальная длина комбинации
  // Новое: список задач, которые уже были в предыдущих уроках
  completedTaskTypes?: Record<number, Set<string>>;
}

@Injectable()
export class LessonGeneratorService {
  private taskIdCounter = 1;
  private readonly DEFAULT_MAX_COMBINATION_LENGTH = 2;
  private readonly MIN_SYMBOLS_FOR_COMBINATIONS = 2;

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
      includeStrokeOrderTasks = true,
      includePairingTasks = true,
      includeReverseRecognition = true,
      includeCombinations = true,
      symbolProgress = {},
      maxCombinationLength = this.DEFAULT_MAX_COMBINATION_LENGTH,
      completedTaskTypes = {},
    } = config;

    const tasks: LessonTask[] = [];
    const availableSymbols = [...symbolsToLearn, ...learnedSymbols];

    // Добавляем прогресс к символам (используем существующий progress или из конфига)
    const symbolsWithProgress: KanaLessonSymbolWithProgress[] =
      symbolsToLearn.map((symbol) => ({
        ...symbol,
        progress:
          symbol.progress !== undefined
            ? symbol.progress
            : symbolProgress[symbol.id] || 0,
      }));

    const learnedSymbolsWithProgress: KanaLessonSymbolWithProgress[] =
      learnedSymbols.map((symbol) => ({
        ...symbol,
        progress:
          symbol.progress !== undefined
            ? symbol.progress
            : symbolProgress[symbol.id] || 80,
      }));

    const allSymbolsWithProgress = [
      ...symbolsWithProgress,
      ...learnedSymbolsWithProgress,
    ];

    // Определяем количество задач
    const taskCount = this.determineTaskCount(symbolsToLearn.length);

    // Создаем ПРИОРИТЕТНЫЕ задачи для новых символов (только для новых символов)
    const newSymbols = symbolsWithProgress.filter((s) => s.progress < 10);
    const establishedSymbols = symbolsWithProgress.filter(
      (s) => s.progress >= 10,
    );

    // Для НОВЫХ символов: первыми всегда аудирование
    for (const symbol of newSymbols) {
      // 1. Аудирование (обязательно первая задача для новых символов)
      if (includeAudioTasks) {
        tasks.push(this.generateAudioTask([symbol], allSymbolsWithProgress));
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

    // Добавляем задачи с комбинациями если есть достаточно символов
    if (
      includeCombinations &&
      availableSymbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS
    ) {
      const combinationTasks = this.generateCombinationTasks(
        allSymbolsWithProgress,
        maxCombinationLength,
        Math.min(3, Math.floor(taskCount * 0.3)), // 30% задач будут комбинациями
        completedTaskTypes,
      );
      tasks.push(...combinationTasks);
    }

    // Генерируем все остальные задачи случайным образом
    while (tasks.length < taskCount) {
      const taskType = this.selectTaskTypeWithProgressAwareness(
        includeWritingTasks,
        includeAudioTasks,
        includeStrokeOrderTasks,
        includePairingTasks,
        includeReverseRecognition,
        includeCombinations,
        symbolsWithProgress,
      );

      let task: LessonTask | null = null;
      const shouldUseCombination =
        includeCombinations &&
        Math.random() > 0.3 && // 70% шанс использовать комбинации
        availableSymbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS &&
        this.canUseCombinations(allSymbolsWithProgress, completedTaskTypes);

      // Выбираем случайный символ (новый или установленный)
      let selectedSymbols: KanaLessonSymbolWithProgress[];

      if (shouldUseCombination) {
        selectedSymbols = this.generateValidCombination(
          allSymbolsWithProgress,
          maxCombinationLength,
          completedTaskTypes,
        );
      } else {
        // Выбираем случайный символ из всех символов
        const allSymbols = [...newSymbols, ...establishedSymbols];
        if (allSymbols.length > 0) {
          selectedSymbols = [this.getRandomElement(allSymbols)];
        } else {
          selectedSymbols = [this.getRandomElement(symbolsWithProgress)];
        }
      }

      switch (taskType) {
        case 'kana-recognition':
          task = this.generateRecognitionTask(
            selectedSymbols,
            allSymbolsWithProgress,
          );
          break;
        case 'kana-reverse-recognition':
          if (includeReverseRecognition) {
            task = this.generateReverseRecognitionTask(
              selectedSymbols,
              allSymbolsWithProgress,
            );
          }
          break;
        case 'kana-writing':
          if (includeWritingTasks) {
            task = this.generateWritingTask(selectedSymbols);
          }
          break;
        case 'kana-stroke-order':
          if (includeStrokeOrderTasks) {
            // Stroke-order всегда только для одиночных символов
            const singleSymbol =
              selectedSymbols.length > 1
                ? [selectedSymbols[0]]
                : selectedSymbols;
            task = this.generateStrokeOrderTask(singleSymbol);
          }
          break;
        case 'kana-audio':
          task = this.generateAudioTask(
            selectedSymbols,
            allSymbolsWithProgress,
          );
          break;
        case 'flashcard':
          task = this.generateFlashcardTask(selectedSymbols);
          break;
      }

      if (task) {
        tasks.push(task);
      }
    }

    // Перемешиваем задачи
    const shuffledTasks = this.shuffleTasks(tasks);

    // Назначаем ID
    shuffledTasks.forEach((task) => {
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
   * Перемешивает задачи с соблюдением ограничений
   */
  private shuffleTasks(tasks: LessonTask[]): LessonTask[] {
    // Сначала перемешиваем все задачи
    const shuffledTasks = [...tasks];
    this.shuffleArray(shuffledTasks);

    // Убеждаемся, что pairing задачи не идут подряд
    for (let i = 1; i < shuffledTasks.length; i++) {
      if (
        shuffledTasks[i].taskType === 'pairing' &&
        shuffledTasks[i - 1].taskType === 'pairing'
      ) {
        // Ищем не-pairing задачу и меняем местами
        for (let j = i + 1; j < shuffledTasks.length; j++) {
          if (shuffledTasks[j].taskType !== 'pairing') {
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
   * Проверяет, можно ли использовать комбинации символов
   * Комбинации разрешены только если все символы имеют прогресс > 0
   * или для символов с прогрессом 0 уже были задачи kana-audio и kana-reverse-recognition
   */
  private canUseCombinations(
    symbols: KanaLessonSymbolWithProgress[],
    completedTaskTypes: Record<number, Set<string>>,
  ): boolean {
    return symbols.every((symbol) => {
      // Если символ уже изучен (прогресс > 0), можно использовать в комбинации
      if (symbol.progress > 0) {
        return true;
      }

      // Для новых символов (прогресс = 0) проверяем, были ли уже базовые задачи
      const completedTasks = completedTaskTypes[symbol.id] || new Set<string>();
      return (
        completedTasks.has('kana-audio') &&
        completedTasks.has('kana-reverse-recognition')
      );
    });
  }

  /**
   * Генерирует валидную комбинацию символов
   */
  private generateValidCombination(
    symbols: KanaLessonSymbolWithProgress[],
    maxCombinationLength: number,
    completedTaskTypes: Record<number, Set<string>>,
  ): KanaLessonSymbolWithProgress[] {
    // Фильтруем символы, которые можно использовать в комбинациях
    const validSymbols = symbols.filter((symbol) => {
      if (symbol.progress > 0) {
        return true;
      }

      const completedTasks = completedTaskTypes[symbol.id] || new Set<string>();
      return (
        completedTasks.has('kana-audio') &&
        completedTasks.has('kana-reverse-recognition')
      );
    });

    if (validSymbols.length < 2) {
      // Если недостаточно валидных символов, возвращаем обычную комбинацию из всех символов
      return this.generateRandomCombination(symbols, maxCombinationLength);
    }

    const combinationLength = Math.min(
      Math.max(
        2,
        Math.floor(Math.random() * Math.min(maxCombinationLength, 3)) + 2,
      ),
      maxCombinationLength,
      validSymbols.length,
    );

    return this.getRandomElements(validSymbols, combinationLength);
  }

  /**
   * Генерирует задачи с комбинациями
   */
  private generateCombinationTasks(
    symbols: KanaLessonSymbolWithProgress[],
    maxCombinationLength: number,
    count: number,
    completedTaskTypes: Record<number, Set<string>>,
  ): LessonTask[] {
    const tasks: LessonTask[] = [];
    const allSymbolsWithProgress = [...symbols];

    // Генерируем комбинации
    for (
      let i = 0;
      i < count && symbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS;
      i++
    ) {
      if (!this.canUseCombinations(symbols, completedTaskTypes)) {
        break; // Прерываем, если нельзя использовать комбинации
      }

      const combination = this.generateValidCombination(
        symbols,
        maxCombinationLength,
        completedTaskTypes,
      );

      // Генерируем разные типы задач для комбинаций
      const taskTypes = [
        'kana-recognition',
        'kana-audio',
        'kana-writing',
        'flashcard',
      ];
      const randomTaskType = this.getRandomElement(taskTypes);

      switch (randomTaskType) {
        case 'kana-recognition':
          tasks.push(
            this.generateRecognitionTask(combination, allSymbolsWithProgress),
          );
          break;
        case 'kana-audio':
          tasks.push(
            this.generateAudioTask(combination, allSymbolsWithProgress),
          );
          break;
        case 'kana-writing':
          tasks.push(this.generateWritingTask(combination));
          break;
        case 'flashcard':
          tasks.push(this.generateFlashcardTask(combination));
          break;
      }
    }

    return tasks;
  }

  /**
   * Генерирует случайную комбинацию символов
   */
  private generateRandomCombination(
    symbols: KanaLessonSymbolWithProgress[],
    maxCombinationLength: number,
  ): KanaLessonSymbolWithProgress[] {
    const combinationLength = Math.min(
      Math.max(
        2,
        Math.floor(Math.random() * Math.min(maxCombinationLength, 3)) + 2,
      ),
      maxCombinationLength,
      symbols.length,
    );

    return this.getRandomElements(symbols, combinationLength);
  }

  /**
   * Генерирует задачи на распознавание (унифицированный метод)
   */
  private generateRecognitionTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');

    // Для одиночного символа используем старую логику, для комбинаций - новую
    const options =
      symbols.length === 1
        ? this.generateRomajiOptions(symbols[0], availableSymbols, 4)
        : this.generateRomajiOptionsForCombinations(
            combinedRomaji,
            availableSymbols,
            4,
            symbols.length,
          );

    const question =
      symbols.length === 1
        ? `Какой ромадзи соответствует символу ${combinedChar}?`
        : `Какой ромадзи соответствует комбинации символов ${combinedChar}?`;

    return {
      id: 0,
      taskType: 'kana-recognition',
      symbols,
      question,
      options,
      correctAnswer: combinedRomaji,
    };
  }

  /**
   * Генерирует задачи на обратное распознавание (унифицированный метод)
   */
  private generateReverseRecognitionTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');

    // Для одиночного символа используем старую логику, для комбинаций - новую
    const options =
      symbols.length === 1
        ? this.generateSymbolOptions(symbols[0], availableSymbols, 4)
        : this.generateSymbolOptionsForCombinations(
            combinedChar,
            availableSymbols,
            4,
            symbols.length,
          );

    const question =
      symbols.length === 1
        ? `Какой символ соответствует ромадзи "${combinedRomaji}"?`
        : `Какая комбинация символов соответствует ромадзи "${combinedRomaji}"?`;

    return {
      id: 0,
      taskType: 'kana-reverse-recognition',
      symbols,
      question,
      options,
      correctAnswer: combinedChar,
    };
  }

  /**
   * Генерирует задачи на написание (унифицированный метод)
   */
  private generateWritingTask(
    symbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');

    const question =
      symbols.length === 1
        ? `Введите ромадзи для символа ${combinedChar}`
        : `Введите ромадзи для комбинации символов ${combinedChar}`;

    return {
      id: 0,
      taskType: 'kana-writing',
      symbols,
      question,
      correctAnswer: combinedRomaji,
      config: {
        inputMode: 'romaji',
      },
    };
  }

  /**
   * Генерирует задачи на аудирование (унифицированный метод)
   */
  private generateAudioTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');

    // Для одиночного символа используем старую логику, для комбинаций - новую
    const options =
      symbols.length === 1
        ? this.generateRomajiOptions(symbols[0], availableSymbols, 4)
        : this.generateRomajiOptionsForCombinations(
            combinedRomaji,
            availableSymbols,
            4,
            symbols.length,
          );

    const question =
      symbols.length === 1
        ? 'Прослушайте аудио и выберите правильный ромадзи'
        : `Прослушайте аудио и выберите правильный ромадзи для комбинации ${combinedChar}`;

    const audioUrl =
      symbols.length === 1
        ? `/api/audio/kana/${symbols[0].id}.mp3`
        : `/api/audio/kana/combination/${symbols.map((s) => s.id).join('-')}.mp3`;

    return {
      id: 0,
      taskType: 'kana-audio',
      symbols,
      question,
      options,
      correctAnswer: combinedRomaji,
      config: {
        audioUrl,
      },
    };
  }

  /**
   * Генерирует задачи на порядок написания (только для одиночных символов)
   * С обновленной логикой конфигурации
   */
  private generateStrokeOrderTask(
    symbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    // Всегда используем только первый символ
    const symbol = symbols[0];

    // Генерируем конфиг на основе прогресса
    const config = this.generateStrokeOrderConfig(symbol);

    return {
      id: 0,
      taskType: 'kana-stroke-order',
      symbols: [symbol],
      question: `Нарисуйте символ ${symbol.char} в правильном порядке`,
      correctAnswer: symbol.char,
      config,
    };
  }

  /**
   * Генерирует конфиг для задачи kana-stroke-order на основе прогресса пользователя
   */
  private generateStrokeOrderConfig(
    symbol: KanaLessonSymbolWithProgress,
  ): Record<string, any> {
    const config: Record<string, any> = {
      symbol: symbol.char,
    };

    const progress = symbol.progress;

    // Для символов с прогрессом выше 30% может быть скрыт шаблон
    if (progress > 30 && Math.random() > 0.7) {
      // 30% шанс скрыть шаблон
      config.hideTemplate = true;
    }

    // Для символов с прогрессом выше 50% может быть уже нарисовано несколько штрихов
    if (progress > 50 && Math.random() > 0.6) {
      // 40% шанс начальных штрихов
      // Определяем количество начальных штрихов (1-3)
      const initialStrokes = Math.floor(Math.random() * 3) + 1;
      config.initialStrokes = initialStrokes;
    }

    // Для символов с прогрессом выше 90% увеличиваем порог ошибок
    if (progress >= 90) {
      // Если шаблон скрыт и/или есть начальные штрихи, увеличиваем порог ошибок
      if (config.hideTemplate || config.initialStrokes) {
        config.errorThreshold = Math.floor(Math.random() * 3) + 4; // 4-6 ошибок
      }
    }

    // Иногда для очень продвинутых пользователей (100%) можем принудительно включить подсказки
    if (progress === 100 && Math.random() > 0.8) {
      // 20% шанс
      config.showHints = true;
    }

    return config;
  }

  /**
   * Генерирует задачи на сопоставление символ-ромадзи
   * С адаптивным количеством пар в зависимости от прогресса
   */
  private generatePairingTask(
    symbolsToLearn: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): LessonTask | null {
    // Фильтруем символы с прогрессом больше 0 (минимальное требование)
    // const eligibleSymbols = availableSymbols.filter(
    //   (symbol) => symbol.progress > 0,
    // );

    if (availableSymbols.length < 2) return null;

    // Определяем количество пар в зависимости от среднего прогресса
    const avgProgress =
      availableSymbols.length > 0
        ? availableSymbols.reduce((sum, symbol) => sum + symbol.progress, 0) /
          availableSymbols.length
        : 0;

    let pairsCount: number;
    if (avgProgress <= 10) {
      // Для низкого прогресса - только 2 пары
      pairsCount = Math.min(2, availableSymbols.length);
    } else {
      // Для высокого прогресса - до 5 пар
      pairsCount = Math.min(5, availableSymbols.length);
    }

    if (pairsCount < 2) return null;

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

  /**
   * Генерирует задачи-флешкарты (унифицированный метод)
   */
  private generateFlashcardTask(
    symbols: KanaLessonSymbolWithProgress[],
  ): LessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');

    const question =
      symbols.length === 1
        ? `Что означает символ ${combinedChar}?`
        : `Что означает комбинация символов ${combinedChar}?`;

    const front = combinedChar;
    const back = combinedRomaji;

    return {
      id: 0,
      taskType: 'flashcard',
      symbols,
      question,
      correctAnswer: combinedRomaji,
      config: {
        front,
        back,
      },
    };
  }

  /**
   * Генерирует варианты ответов ромадзи для комбинаций
   */
  private generateRomajiOptionsForCombinations(
    correctRomaji: string,
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
    combinationLength: number,
  ): string[] {
    const options = new Set<string>([correctRomaji]);

    // Добавляем случайные комбинации из доступных символов
    while (options.size < count && allSymbols.length >= 2) {
      const selectedSymbols = this.getRandomElements(
        allSymbols,
        combinationLength,
      );
      const combinedRomaji = selectedSymbols.map((s) => s.romaji).join('');

      if (combinedRomaji !== correctRomaji) {
        options.add(combinedRomaji);
      }
    }

    // Если не хватает вариантов, добавляем случайные комбинации из базового пула
    const baseRomajis = [
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
    ];
    while (options.size < count) {
      let combinedRomaji = '';
      for (let i = 0; i < combinationLength; i++) {
        combinedRomaji += this.getRandomElement(baseRomajis);
      }

      if (combinedRomaji !== correctRomaji) {
        options.add(combinedRomaji);
      }
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  /**
   * Генерирует варианты ответов символов для комбинаций
   */
  private generateSymbolOptionsForCombinations(
    correctChars: string,
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
    combinationLength: number,
  ): string[] {
    const options = new Set<string>([correctChars]);

    // Добавляем случайные комбинации из доступных символов
    while (options.size < count && allSymbols.length >= 2) {
      const selectedSymbols = this.getRandomElements(
        allSymbols,
        combinationLength,
      );
      const combinedChars = selectedSymbols.map((s) => s.char).join('');

      if (combinedChars !== correctChars) {
        options.add(combinedChars);
      }
    }

    // Если не хватает вариантов, добавляем случайные комбинации
    const baseChars = allSymbols.map((s) => s.char);
    while (options.size < count) {
      let combinedChars = '';
      for (let i = 0; i < combinationLength; i++) {
        combinedChars += this.getRandomElement(baseChars);
      }

      if (combinedChars !== correctChars) {
        options.add(combinedChars);
      }
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  /**
   * Генерирует варианты ответов ромадзи (для одиночных символов)
   */
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

  /**
   * Генерирует варианты ответов символов (для одиночных символов)
   */
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

  /**
   * Выбирает тип задачи с учетом прогресса пользователя
   */
  private selectTaskTypeWithProgressAwareness(
    includeWriting: boolean,
    includeAudio: boolean,
    includeStrokeOrder: boolean,
    includePairing: boolean,
    includeReverseRecognition: boolean,
    includeCombinations: boolean,
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
    let strokeOrderProbability = 0.1;
    let writingProbability = 0.1;
    let pairingProbability = 0.08; // Базовая вероятность
    let flashcardProbability = 0.1;

    // Уменьшаем вероятность pairing для низкого прогресса
    if (avgProgress <= 10) {
      pairingProbability = 0.03; // Сильно уменьшаем шанс
    } else if (avgProgress <= 30) {
      pairingProbability = 0.05; // Умеренно уменьшаем шанс
    }

    if (avgProgress >= 40 && includeCombinations) {
      audioProbability = 0.15;
      recognitionProbability = 0.2;
      reverseRecognitionProbability = 0.2;
      strokeOrderProbability = 0.1;
      writingProbability = 0.15;
      flashcardProbability = 0.1;
    }

    const probabilities = [
      { type: 'kana-audio', probability: audioProbability },
      {
        type: 'kana-reverse-recognition',
        probability: reverseRecognitionProbability,
      },
      { type: 'kana-recognition', probability: recognitionProbability },
      { type: 'kana-writing', probability: writingProbability },
      { type: 'kana-stroke-order', probability: strokeOrderProbability },
      { type: 'pairing', probability: pairingProbability },
      { type: 'flashcard', probability: flashcardProbability },
    ];

    const random = Math.random();
    let cumulativeProbability = 0;

    for (const prob of probabilities) {
      cumulativeProbability += prob.probability;

      // Проверяем, можно ли использовать этот тип задач
      let canUse = true;
      switch (prob.type) {
        case 'kana-audio':
          canUse = includeAudio;
          break;
        case 'kana-reverse-recognition':
          canUse = includeReverseRecognition;
          break;
        case 'kana-writing':
          canUse = includeWriting;
          break;
        case 'kana-stroke-order':
          canUse = includeStrokeOrder;
          break;
        case 'pairing':
          canUse = includePairing;
          break;
      }

      if (canUse && random < cumulativeProbability) {
        return prob.type;
      }
    }

    // Если ничего не подошло, возвращаем flashcard как fallback
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
        case 'pairing':
          totalSeconds += 60;
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
   * Возвращает несколько случайных элементов из массива
   */
  private getRandomElements<T>(array: T[], count: number): T[] {
    if (array.length === 0) return [];
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Перемешивает массив по алгоритму Фишера-Йетса
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Генерирует уникальный ID для задачи
   */
  private generateTaskId(): number {
    return this.taskIdCounter++;
  }
}
