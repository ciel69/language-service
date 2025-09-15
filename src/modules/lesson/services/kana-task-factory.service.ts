// src/lesson/service/kana-task-factory.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BaseTaskFactoryService } from './base-task-factory.service';
import { LessonUtilsService } from './lesson-utils.service';
import { KanaLessonSymbolWithProgress, KanaLessonTask } from './lesson.types';

@Injectable()
export class KanaTaskFactoryService extends BaseTaskFactoryService<
  KanaLessonSymbolWithProgress,
  KanaLessonTask
> {
  private readonly logger = new Logger(KanaTaskFactoryService.name);
  private readonly romajiPool = [
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
    'na',
    'ni',
    'nu',
    'ne',
    'no',
    'ha',
    'hi',
    'fu',
    'he',
    'ho',
    'ma',
    'mi',
    'mu',
    'me',
    'mo',
    'ya',
    'yu',
    'yo',
    'ra',
    'ri',
    'ru',
    're',
    'ro',
    'wa',
    'wo',
    'n',
  ];

  constructor(utils: LessonUtilsService) {
    super(utils);
  }

  createTask(
    taskType: string,
    symbols: KanaLessonSymbolWithProgress[],
    allSymbols: KanaLessonSymbolWithProgress[],
    config?: Record<string, any>,
  ): KanaLessonTask | null {
    this.logger.log(
      `Создание урока с типом ${taskType}, количество символов ${symbols.length}`,
    );
    switch (taskType) {
      case 'kana-recognition':
        return this.generateKanaRecognitionTask(symbols, allSymbols);
      case 'kana-reverse-recognition':
        return this.generateKanaReverseRecognitionTask(symbols, allSymbols);
      case 'kana-writing':
        return this.generateKanaWritingTask(symbols);
      case 'kana-stroke-order':
        return this.generateKanaStrokeOrderTask(symbols, config);
      case 'kana-audio':
        return this.generateKanaAudioTask(symbols, allSymbols);
      case 'flashcard':
        return this.generateFlashcardTask(symbols);
      case 'pairing':
        return this.generatePairingTask(allSymbols, config);
      case 'kana-combination': // Новый тип задачи
        return this.generateKanaCombinationTask(symbols, allSymbols);
      default:
        return null;
    }
  }

  // --- Конкретные методы генерации задач Каны ---
  // (Логика взята из оригинального lesson-generator.service.ts)

  generateKanaRecognitionTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');
    // Для одиночного символа используем старую логику, для комбинаций - новую
    const options =
      symbols.length === 1
        ? this.generateRomajiOptions(symbols, availableSymbols, 4)
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

  generateKanaReverseRecognitionTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');
    const options = this.generateSymbolOptions(
      symbols,
      availableSymbols,
      4,
      symbols.length > 1,
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

  generateKanaWritingTask(
    symbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask {
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
      const initialStrokes = Math.floor(Math.random()) + 1;
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

  generateKanaStrokeOrderTask(
    symbols: KanaLessonSymbolWithProgress[],
    config?: Record<string, any>,
  ): KanaLessonTask {
    const symbol = symbols[0];

    const newConfig = this.generateStrokeOrderConfig(symbol);

    return {
      id: 0,
      taskType: 'kana-stroke-order',
      symbols: [symbol],
      question: `Нарисуйте символ ${symbol.char} в правильном порядке`,
      correctAnswer: symbol.char,
      config: config || newConfig,
    };
  }

  /**
   * Генерирует задачи на аудирование (kana-audio) с возможностью показа символа.
   * @param symbols - Символы для задачи (обычно один).
   * @param availableSymbols - Все доступные символы (для генерации опций).
   * @returns Сгенерированная задача или null.
   */
  generateKanaAudioTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask | null {
    if (symbols.length === 0) return null;

    const symbol = symbols[0]; // Обычно одна задача на один символ
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');
    // Для одиночного символа используем старую логику, для комбинаций - новую
    const options =
      symbols.length === 1
        ? this.generateRomajiOptions(symbols, availableSymbols, 4)
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

    // --- НОВАЯ ЛОГИКА: Генерация showSymbol ---
    let showSymbol: boolean | undefined = undefined;

    // Вероятность показа символа зависит от прогресса.
    // Чем выше прогресс, тем меньше шанс.
    // Пример: Прогресс 0% -> 70% шанс, Прогресс 50% -> 35% шанс, Прогресс 100% -> 0% шанс
    const progress = symbol.progress;
    // Базовая вероятность показа символа (при прогрессе 0)
    const baseShowSymbolProbability = 0.9;
    // Вероятность уменьшается линейно с прогрессом
    const showSymbolProbability = Math.max(
      0,
      baseShowSymbolProbability * (1 - progress / 100),
    );

    // Генерируем случайное число и сравниваем с вероятностью
    if (Math.random() < showSymbolProbability) {
      showSymbol = true;
    }
    // Если showSymbol остается undefined, это означает, что символ не показывается.
    // Это соответствует оригинальному поведению, где showSymbol не было.
    // -------------------------------

    // Формируем конфиг
    const config: Record<string, any> = {
      audioUrl,
    };
    // Добавляем showSymbol в конфиг, только если он true
    // (если false или undefined, можно не добавлять, чтобы не захламлять)
    if (showSymbol === true) {
      config.showSymbol = showSymbol;
    }

    return {
      id: 0,
      taskType: 'kana-audio',
      symbols,
      question,
      options,
      correctAnswer: combinedRomaji,
      config, // Передаем обновленный конфиг
    };
  }

  generateFlashcardTask(
    symbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask {
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

  generatePairingTask(
    availableSymbols: KanaLessonSymbolWithProgress[],
    config?: Record<string, any>,
  ): KanaLessonTask | null {
    if (availableSymbols.length < 2) return null;

    const avgProgress =
      availableSymbols.reduce((sum, symbol) => sum + symbol.progress, 0) /
      availableSymbols.length;

    let pairsCount: number;
    if (avgProgress <= 10) {
      pairsCount = Math.min(2, availableSymbols.length);
    } else {
      pairsCount = Math.min(5, availableSymbols.length);
    }

    if (pairsCount < 2) return null;

    // Проверяем конфигурацию для определения необходимости комбинаций
    const isCombinationTask = config?.minSymbols > 1;

    let selectedSymbols: KanaLessonSymbolWithProgress[];

    if (isCombinationTask) {
      // Для комбинационных задач генерируем комбинации из одиночных символов
      const singleSymbols = availableSymbols.filter((s) => s.char.length === 1);

      if (singleSymbols.length < 4) {
        // Нужно минимум 4 символа для 2 комбинаций
        return null;
      }

      // Генерируем комбинации
      const generatedCombinations: KanaLessonSymbolWithProgress[] = [];

      // Создаем 2 комбинации по 2 символа каждая
      for (
        let i = 0;
        i < Math.min(2, Math.floor(singleSymbols.length / 2));
        i++
      ) {
        const combinationSymbols = this.utils.getRandomElements(
          singleSymbols,
          2,
        );
        const combination = this.createVirtualSymbol(combinationSymbols);
        generatedCombinations.push(combination);
      }

      // Выбираем 2-3 одиночных символа
      const singleCount = pairsCount - generatedCombinations.length;
      const selectedSingles = this.utils.getRandomElements(
        singleSymbols,
        Math.min(singleCount, singleSymbols.length),
      );

      selectedSymbols = [...generatedCombinations, ...selectedSingles];
    } else {
      // Для обычных задач выбираем любые существующие символы
      selectedSymbols = this.utils.getRandomElements(
        availableSymbols,
        Math.min(pairsCount, availableSymbols.length),
      );
    }

    const pairs = selectedSymbols.map((symbol) => ({
      symbol,
      romaji: symbol.romaji,
    }));

    const romajis = pairs.map((p) => p.romaji);

    return {
      id: 0,
      taskType: 'pairing',
      question: isCombinationTask
        ? 'Соедините символы и комбинации с их ромадзи'
        : 'Соедините символы с их ромадзи',
      options: this.utils.shuffleArray(romajis),
      correctAnswer: pairs.map((p) => p.romaji),
      config: {
        pairs: pairs.map((p) => ({
          char: p.symbol.char,
          romaji: p.romaji,
          id: p.symbol.id,
        })),
        isCombination: isCombinationTask,
      },
    };
  }

  /**
   * Генерирует задачу для работы с комбинациями кана-символов (например, む+め = むめ)
   *
   * Задача имеет два случайных направления:
   * 1. Char-to-Romaji: Пользователю показываются символы (например, むめ),
   *    он должен ввести соответствующий ромадзи (mume)
   * 2. Romaji-to-Char: Пользователю показывается ромадзи (например, mume),
   *    он должен составить комбинацию из отдельных символов, выбирая из предложенных вариантов
   *
   * В обоих случаях используется унифицированный вопрос "Составьте комбинацию символов",
   * так как суть задачи одна - работа с комбинациями, независимо от направления.
   *
   * @param symbols - Символы для текущей задачи (должно быть 2 или более для комбинации)
   * @param availableSymbols - Все доступные символы для генерации опций выбора
   * @returns Сгенерированная задача или null, если символов недостаточно
   */
  generateKanaCombinationTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask | null {
    // Задача только для комбинаций (2 и более символов)
    if (symbols.length < 2) return null;

    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');

    // Случайным образом выбираем направление задачи
    const isCharToRomaji = false;

    // Унифицированный вопрос для обоих направлений
    const question = `Составьте комбинацию символов`;

    let correctAnswer: string;
    let config: Record<string, any>;
    let options: string[];

    if (isCharToRomaji) {
      // Пользователю показывают символы, он вводит ромадзи
      correctAnswer = combinedRomaji;
      // Генерируем опции ромадзи для автозаполнения/подсказок
      options = this.generateRomajiOptions(symbols, availableSymbols, 5);
      config = {
        inputMode: 'romaji',
        displayContent: combinedChar,
      };
    } else {
      // Пользователю показывают ромадзи, он выбирает символы
      correctAnswer = combinedChar;
      // Генерируем опции символов для выбора
      const symbolOptions = this.generateSymbolOptions(
        symbols,
        availableSymbols,
        5,
        false,
      );
      options = symbolOptions.map((s) => s.char);
      config = {
        inputMode: 'symbol',
        displayContent: combinedRomaji,
      };
    }

    return {
      id: 0,
      taskType: 'kana-combination',
      symbols,
      question,
      options,
      correctAnswer,
      config,
    };
  }

  /**
   * Улучшенный метод выбора символов для паринга с поддержкой комбинаций
   */
  private selectSymbolsForPairing(
    availableSymbols: KanaLessonSymbolWithProgress[],
    count: number,
  ): KanaLessonSymbolWithProgress[] {
    const selected: KanaLessonSymbolWithProgress[] = [];
    const usedIds = new Set<number>();

    // Сначала выбираем отдельные символы
    const singleSymbols = availableSymbols.filter((s) => s.char.length === 1);
    const combinationSymbols = availableSymbols.filter(
      (s) => s.char.length > 1,
    );

    // Определяем соотношение одиночных и комбинированных символов
    const combinationRatio = 0.4; // 40% комбинаций
    const combinationCount = Math.floor(count * combinationRatio);
    const singleCount = count - combinationCount;

    // Выбираем одиночные символы
    const selectedSingles = this.utils.getRandomElements(
      singleSymbols.filter((s) => !usedIds.has(s.id)),
      Math.min(singleCount, singleSymbols.length),
    );

    selectedSingles.forEach((s) => {
      selected.push(s);
      usedIds.add(s.id);
    });

    // Выбираем комбинации
    const selectedCombinations = this.utils.getRandomElements(
      combinationSymbols.filter((s) => !usedIds.has(s.id)),
      Math.min(combinationCount, combinationSymbols.length),
    );

    selectedCombinations.forEach((s) => {
      selected.push(s);
      usedIds.add(s.id);
    });

    // Если не хватает символов, добираем из оставшихся
    const remainingNeeded = count - selected.length;
    if (remainingNeeded > 0) {
      const remainingSymbols = availableSymbols.filter(
        (s) => !usedIds.has(s.id),
      );
      const additional = this.utils.getRandomElements(
        remainingSymbols,
        remainingNeeded,
      );
      selected.push(...additional);
    }

    return selected;
  }

  // --- Вспомогательные методы для генерации опций ---
  private generateRomajiOptions(
    correctSymbol: KanaLessonSymbolWithProgress[],
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
    isCombination: boolean = false, // Добавляем флаг для определения типа задачи
  ): string[] {
    const correctly = correctSymbol.map((item) => item.romaji);
    const options = new Set<string>(correctly);
    while (options.size < count && allSymbols.length >= count) {
      const randomSymbol = this.utils.getRandomElement(allSymbols);
      if (!correctly.includes(randomSymbol.romaji)) {
        options.add(randomSymbol.romaji);
      }
    }
    const romajiPool = this.romajiPool;
    while (options.size < count) {
      const randomRomaji = this.utils.getRandomElement(romajiPool);
      options.add(randomRomaji);
    }
    return Array.from(options).sort(() => Math.random() - 0.5);
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
      const selectedSymbols = this.utils.getRandomElements(
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
        combinedRomaji += this.utils.getRandomElement(baseRomajis);
      }

      if (combinedRomaji !== correctRomaji) {
        options.add(combinedRomaji);
      }
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  private generateSymbolOptions(
    correctSymbols: KanaLessonSymbolWithProgress[],
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
    isCombination: boolean = false, // Добавляем флаг для определения типа задачи
  ): KanaLessonSymbolWithProgress[] {
    if (isCombination) {
      const correctSymbolVirtual = this.createVirtualSymbol(correctSymbols);
      const options = new Set<KanaLessonSymbolWithProgress>([
        correctSymbolVirtual,
      ]);
      // Для комбинаций генерируем комбинации символов той же длины
      while (options.size < count) {
        const combinationLength = correctSymbols.length;
        const selectedSymbols = this.utils.getRandomElements(
          allSymbols,
          combinationLength,
        );
        const virtualSymbol = this.createVirtualSymbol(selectedSymbols);
        const isDuplicate = Array.from(options).some(
          (opt) =>
            opt['char'] === virtualSymbol['char'] &&
            opt['romaji'] === virtualSymbol['romaji'],
        );
        if (!isDuplicate) {
          options.add(virtualSymbol);
        }
      }
      return this.utils.shuffleArray(Array.from(options));
    } else {
      const options = new Set<KanaLessonSymbolWithProgress>(correctSymbols);

      // Добавляем дополнительные символы до нужного количества
      while (options.size < count && allSymbols.length > 0) {
        const randomSymbol = this.utils.getRandomElement(allSymbols);
        const isDuplicate = Array.from(options).some(
          (opt) => opt.id === randomSymbol.id,
        );
        if (!isDuplicate) {
          options.add(randomSymbol);
        }
      }
      return this.utils.shuffleArray(Array.from(options));
    }
  }

  private createVirtualSymbol(
    symbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonSymbolWithProgress {
    const kanaSymbols = symbols;
    const combinedChar = kanaSymbols.map((s) => s.char).join('');
    const combinedRomaji = kanaSymbols.map((s) => s.romaji).join('');
    return {
      id: -((Date.now() % 1000000) + Math.floor(Math.random() * 1000)),
      char: combinedChar,
      romaji: combinedRomaji,
      createdAt: new Date(),
      progress: 0, // Виртуальный символ
    } as KanaLessonSymbolWithProgress;
  }
  // --- Конец вспомогательных методов ---
}
