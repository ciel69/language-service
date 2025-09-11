// src/lesson/service/kana-task-factory.service.ts
import { Injectable } from '@nestjs/common';
import { BaseTaskFactoryService } from './base-task-factory.service';
import { LessonUtilsService } from './lesson-utils.service';
import { KanaLessonSymbolWithProgress, KanaLessonTask } from './lesson.types';

@Injectable()
export class KanaTaskFactoryService extends BaseTaskFactoryService<
  KanaLessonSymbolWithProgress,
  KanaLessonTask
> {
  private readonly ROMAJI_POOL = [
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
        return this.generatePairingTask(allSymbols);
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

  generateKanaReverseRecognitionTask(
    symbols: KanaLessonSymbolWithProgress[],
    availableSymbols: KanaLessonSymbolWithProgress[],
  ): KanaLessonTask {
    const combinedChar = symbols.map((s) => s.char).join('');
    const combinedRomaji = symbols.map((s) => s.romaji).join('');
    const options = this.generateSymbolOptions(symbols, availableSymbols, 4);

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

    // --- НОВАЯ ЛОГИКА: Генерация showSymbol ---
    let showSymbol: boolean | undefined = undefined;

    // Вероятность показа символа зависит от прогресса.
    // Чем выше прогресс, тем меньше шанс.
    // Пример: Прогресс 0% -> 70% шанс, Прогресс 50% -> 35% шанс, Прогресс 100% -> 0% шанс
    const progress = symbol.progress;
    // Базовая вероятность показа символа (при прогрессе 0)
    const baseShowSymbolProbability = 0.7;
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

    const selectedSymbols = this.utils.getRandomElements(
      availableSymbols,
      pairsCount,
    );
    const pairs = selectedSymbols.map((symbol) => ({
      symbol,
      romaji: symbol.romaji,
    }));
    const romajis = pairs.map((p) => p.romaji);

    return {
      id: 0,
      taskType: 'pairing',
      question: 'Соедините символы с их ромадзи',
      options: this.utils.shuffleArray(romajis),
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

  // --- Вспомогательные методы для генерации опций ---
  private generateRomajiOptions(
    correctSymbol: KanaLessonSymbolWithProgress,
    allSymbols: KanaLessonSymbolWithProgress[],
    count: number,
  ): string[] {
    const options = new Set<string>([correctSymbol.romaji]);
    while (options.size < count && allSymbols.length >= count) {
      const randomSymbol = this.utils.getRandomElement(allSymbols);
      if (randomSymbol.romaji !== correctSymbol.romaji) {
        options.add(randomSymbol.romaji);
      }
    }
    const romajiPool = this.ROMAJI_POOL;
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
  ): KanaLessonSymbolWithProgress[] {
    const isCombination = correctSymbols.length > 1;
    const correctSymbolVirtual = this.createVirtualSymbol(correctSymbols);
    const options = new Set<KanaLessonSymbolWithProgress>([
      correctSymbolVirtual,
    ]);

    if (isCombination) {
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
    } else {
      const correctSymbolSingle = correctSymbols[0];
      while (options.size < count && allSymbols.length >= count) {
        const randomSymbol = this.utils.getRandomElement(allSymbols);
        if (randomSymbol.id !== correctSymbolSingle.id) {
          options.add(randomSymbol);
        }
      }
      const symbolPool = allSymbols.filter(
        (s) => s.id !== correctSymbolSingle.id,
      );
      while (options.size < count && symbolPool.length > 0) {
        const randomSymbol = this.utils.getRandomElement(symbolPool);
        options.add(randomSymbol);
      }
    }
    return this.utils.shuffleArray(Array.from(options));
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
