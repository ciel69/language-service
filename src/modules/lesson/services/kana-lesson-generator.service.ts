// src/lesson/service/kana-lesson-generator.service.ts
import { Injectable } from '@nestjs/common';
import { SrsService } from '@/services/srs.service';
import { BaseLessonGeneratorService } from './base-lesson-generator.service';
import { LessonUtilsService } from './lesson-utils.service';
import { KanaTaskFactoryService } from './kana-task-factory.service';
import {
  KanaLessonSymbolWithProgress,
  KanaLessonTask,
  GeneratedKanaLesson,
  KanaLessonGenerationConfig,
} from './lesson.types';
import { KanaLessonSymbol } from '@/modules/kana/kana.service';

@Injectable()
export class KanaLessonGeneratorService extends BaseLessonGeneratorService<
  KanaLessonSymbol,
  KanaLessonTask
> {
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

  constructor(
    srsService: SrsService,
    utils: LessonUtilsService,
    private readonly taskFactory: KanaTaskFactoryService,
  ) {
    super(srsService, utils);
  }

  generateKanaLesson(
    symbolsToLearn: KanaLessonSymbol[],
    learnedSymbols: KanaLessonSymbol[],
    config: KanaLessonGenerationConfig = {},
  ): GeneratedKanaLesson {
    const {
      includeAudioTasks = true,
      includePairingTasks = true,
      includeCombinations = true,
      symbolProgress = {},
      maxCombinationLength = this.DEFAULT_MAX_COMBINATION_LENGTH,
    } = config;

    const tasks: KanaLessonTask[] = [];
    const availableSymbols = [...symbolsToLearn, ...learnedSymbols];
    const symbolsWithProgress: KanaLessonSymbolWithProgress[] =
      symbolsToLearn.map((symbol) =>
        this.createSymbolWithProgress(symbol, symbol.progress, symbolProgress),
      );
    const learnedSymbolsWithProgress: KanaLessonSymbolWithProgress[] =
      learnedSymbols.map((symbol) =>
        this.createSymbolWithProgress(symbol, symbol.progress, symbolProgress),
      );
    const allSymbolsWithProgress = [
      ...symbolsWithProgress,
      ...learnedSymbolsWithProgress,
    ];

    const usedSymbols = new Set<number>();
    const usedSymbolCombinations = new Set<string>();
    const usedTaskTypesBySymbol = new Map<number, Set<string>>();

    const taskCount = this.determineTaskCount(symbolsToLearn.length);

    // 1. Приоритетные задачи: kana-audio для новых символов
    for (const symbol of symbolsWithProgress) {
      if (includeAudioTasks) {
        const task = this.taskFactory.createTask(
          'kana-audio',
          [symbol],
          allSymbolsWithProgress,
        );
        if (task) {
          tasks.push(task);
          usedSymbols.add(symbol.id);
          this.addUsedTaskType(usedTaskTypesBySymbol, symbol.id, 'kana-audio');
        }
      }
    }

    // 2. Pairing задачи
    if (includePairingTasks) {
      const pairingCount = Math.min(2, Math.floor(taskCount * 0.15));
      for (let i = 0; i < pairingCount; i++) {
        const task = this.taskFactory.createTask(
          'pairing',
          [],
          allSymbolsWithProgress,
        );
        if (task) tasks.push(task);
      }
    }

    // 3. Задачи с комбинациями
    if (
      includeCombinations &&
      availableSymbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS
    ) {
      const combinationTasks = this.generateCombinationTasks(
        allSymbolsWithProgress, // Передаем ВСЕ символы с прогрессом
        maxCombinationLength,
        Math.min(3, Math.floor(taskCount * 0.3)), // Пример: до 30% задач могут быть комбинациями
        tasks,
        usedSymbols,
        usedSymbolCombinations,
        usedTaskTypesBySymbol,
      );
      tasks.push(...combinationTasks);
    }

    // 4. Остальные задачи
    while (tasks.length < taskCount) {
      const taskType = this.selectTaskTypeWithProgressAwareness(
        config,
        symbolsWithProgress,
        tasks,
      );
      let task: KanaLessonTask | null = null;
      const shouldUseCombination =
        includeCombinations &&
        Math.random() > 0.3 && // 70% шанс использовать комбинации, если разрешены
        availableSymbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS &&
        this.canUseCombinations(allSymbolsWithProgress, tasks);

      let selectedSymbols: KanaLessonSymbolWithProgress[] = [];
      if (shouldUseCombination) {
        // Генерируем комбинацию
        selectedSymbols = this.generateValidCombinationWithoutRepeats(
          allSymbolsWithProgress,
          maxCombinationLength,
          tasks,
          usedSymbolCombinations,
        );
        // Если комбинацию сгенерировать не удалось, fallback на одиночный символ
        if (selectedSymbols.length === 0) {
          selectedSymbols = this.selectSymbolsWithoutRepeats(
            allSymbolsWithProgress,
            usedSymbols,
            usedTaskTypesBySymbol,
            taskType,
          );
        }
      } else {
        // Выбираем одиночный символ
        selectedSymbols = this.selectSymbolsWithoutRepeats(
          allSymbolsWithProgress,
          usedSymbols,
          usedTaskTypesBySymbol,
          taskType,
        );
      }

      // Если не можем выбрать уникальные символы, выбираем любые
      if (selectedSymbols.length === 0) {
        const allSymbols = [
          ...symbolsWithProgress,
          ...learnedSymbolsWithProgress,
        ];
        if (allSymbols.length > 0) {
          // Для комбинаций лучше брать случайную комбинацию, если возможно
          if (shouldUseCombination) {
            selectedSymbols = this.generateValidCombinationWithoutRepeats(
              allSymbolsWithProgress,
              maxCombinationLength,
              tasks,
              usedSymbolCombinations,
            );
          }
          // Если и это не удалось, берем одиночный
          if (selectedSymbols.length === 0) {
            selectedSymbols = [this.utils.getRandomElement(allSymbols)];
          }
        } else {
          break; // Прерываем, если нет символов
        }
      }

      // Проверяем, не использовалась ли уже эта задача для этих символов
      // (Логика для комбинаций упрощена)
      const combinationKey = this.getSymbolCombinationKey(selectedSymbols);
      // const taskKey = `${combinationKey}-${taskType}`; // Можно использовать для более строгой проверки
      // Пропускаем, если такая задача уже была (упрощенная проверка только для одиночных)
      if (
        selectedSymbols.length === 1 &&
        this.isTaskAlreadyUsed(
          combinationKey,
          taskType,
          usedTaskTypesBySymbol,
          selectedSymbols,
        )
      ) {
        continue;
      }

      task = this.taskFactory.createTask(
        taskType,
        selectedSymbols,
        allSymbolsWithProgress,
      );

      if (task) {
        tasks.push(task);
        selectedSymbols.forEach((symbol) => {
          usedSymbols.add(symbol.id);
          this.addUsedTaskType(usedTaskTypesBySymbol, symbol.id, taskType);
        });
        usedSymbolCombinations.add(combinationKey);
      }
    }

    const shuffledTasks = this.taskFactory.shuffleTasks(tasks, [
      'pairing',
      'kana-audio',
      'kana-stroke-order',
    ]);
    shuffledTasks.forEach((task) => {
      task.id = this.generateTaskId();
    });

    return {
      lessonId: Date.now(),
      title: 'Урок хираганы/катаканы',
      description: `Изучение ${symbolsToLearn.length} символов`,
      tasks: shuffledTasks.slice(0, taskCount),
      estimatedDuration: this.estimateLessonDuration(
        shuffledTasks.slice(0, taskCount),
      ),
    };
  }

  // --- Реализация абстрактных методов ---
  protected createSymbolWithProgress(
    symbol: KanaLessonSymbol,
    progress?: number,
    configProgress: Record<number, number> = {},
  ): KanaLessonSymbolWithProgress {
    return {
      ...symbol,
      progress:
        progress !== undefined ? progress : configProgress[symbol.id] || 0,
    };
  }

  /**
   * Выбирает тип задачи с учетом прогресса пользователя и стремится к разнообразию в уроке
   * @param config - Конфигурация генерации
   * @param symbolsWithProgress - Символы с прогрессом
   * @param currentTasksInLesson - Задачи, уже добавленные в текущий урок
   * @returns Тип задачи
   */
  protected selectTaskTypeWithProgressAwareness(
    config: KanaLessonGenerationConfig,
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
    currentTasksInLesson: KanaLessonTask[], // Список задач, уже добавленных в текущий урок
  ): string {
    const avgProgress =
      symbolsWithProgress.length > 0
        ? symbolsWithProgress.reduce(
            (sum, symbol) => sum + symbol.progress,
            0,
          ) / symbolsWithProgress.length
        : 0;

    // --- БАЗОВЫЕ ВЕРОЯТНОСТИ ---
    // Увеличиваем вероятность stroke-order
    let audioProbability = 0.2;
    let recognitionProbability = 0.15;
    let reverseRecognitionProbability = 0.15;
    let strokeOrderProbability = 0.15; // Увеличено с 0.1
    let writingProbability = 0.1;
    let pairingProbability = 0.08;
    let flashcardProbability = 0.1;

    if (avgProgress <= 10) {
      pairingProbability = 0.03;
    } else if (avgProgress <= 30) {
      pairingProbability = 0.05;
    }

    if (avgProgress >= 40 && config.includeCombinations) {
      audioProbability = 0.15;
      recognitionProbability = 0.2;
      reverseRecognitionProbability = 0.2;
      strokeOrderProbability = 0.15; // Увеличено и сохранено
      writingProbability = 0.15;
      flashcardProbability = 0.1;
    }
    // --------------------------

    // --- КОРРЕКТИРОВКА ВЕРОЯТНОСТЕЙ НА ОСНОВЕ ТЕКУЩЕГО УРОКА ---
    const taskTypeCounts: Record<string, number> = {};
    currentTasksInLesson.forEach((task) => {
      taskTypeCounts[task.taskType] = (taskTypeCounts[task.taskType] || 0) + 1;
    });
    const totalCurrentTasks = currentTasksInLesson.length;

    const typesToAdjust = [
      'kana-audio',
      'kana-recognition',
      'kana-reverse-recognition',
      'kana-writing',
      'kana-stroke-order',
      'pairing',
      'flashcard',
    ];

    const adjustedProbabilities: Record<string, number> = {
      'kana-audio': audioProbability,
      'kana-recognition': recognitionProbability,
      'kana-reverse-recognition': reverseRecognitionProbability,
      'kana-writing': writingProbability,
      'kana-stroke-order': strokeOrderProbability,
      pairing: pairingProbability,
      flashcard: flashcardProbability,
    };

    if (totalCurrentTasks > 0) {
      typesToAdjust.forEach((taskType) => {
        const currentCount = taskTypeCounts[taskType] || 0;
        const currentRatio = currentCount / totalCurrentTasks;
        const expectedRatio = adjustedProbabilities[taskType];

        // Если текущая доля в 2 и более раза превышает ожидаемую, сильно снижаем вероятность
        if (currentRatio > expectedRatio * 2.0) {
          adjustedProbabilities[taskType] *= 0.1; // Сильное снижение
        }
        // Если текущая доля в 1.5 и более раза превышает ожидаемую, снижаем вероятность
        else if (currentRatio > expectedRatio * 1.5) {
          adjustedProbabilities[taskType] *= 0.5; // Среднее снижение
        }
      });
    }
    // ---------------------------------------------------------

    // --- СПИСОК ДОСТУПНЫХ ТИПОВ ЗАДАЧ ---
    const availableTaskTypes = [
      {
        type: 'kana-audio',
        probability: adjustedProbabilities['kana-audio'],
        flag: config.includeAudioTasks ?? true,
      },
      {
        type: 'kana-reverse-recognition',
        probability: adjustedProbabilities['kana-reverse-recognition'],
        flag: config.includeReverseRecognition ?? true,
      },
      {
        type: 'kana-recognition',
        probability: adjustedProbabilities['kana-recognition'],
        flag: true,
      },
      {
        type: 'kana-writing',
        probability: adjustedProbabilities['kana-writing'],
        flag: config.includeWritingTasks ?? true,
      },
      {
        type: 'kana-stroke-order',
        probability: adjustedProbabilities['kana-stroke-order'],
        flag: config.includeStrokeOrderTasks ?? true,
      },
      {
        type: 'pairing',
        probability: adjustedProbabilities['pairing'],
        flag: config.includePairingTasks ?? true,
      },
      {
        type: 'flashcard',
        probability: adjustedProbabilities['flashcard'],
        flag: true,
      },
    ];
    // ------------------------------------

    // --- ПРЕДОТВРАЩЕНИЕ ПОВТОРЕНИЯ ПОСЛЕДНЕЙ ЗАДАЧИ ---
    // Получаем тип последней добавленной задачи
    const lastTaskType =
      currentTasksInLesson.length > 0
        ? currentTasksInLesson[currentTasksInLesson.length - 1].taskType
        : null;
    // -----------------------------------------------

    // --- ЦИКЛ ВЫБОРА ---
    let maxAttempts = 20; // Ограничение на количество попыток, чтобы избежать бесконечного цикла
    while (maxAttempts > 0) {
      maxAttempts--;

      const random = Math.random();
      let cumulativeProbability = 0;

      // Создаем копию массива и перемешиваем его, чтобы избежать предсказуемости
      const shuffledTypes = this.utils.shuffleArray([...availableTaskTypes]);

      for (const taskTypeItem of shuffledTypes) {
        // Пропускаем, если флаг отключен
        if (!taskTypeItem.flag) continue;

        // Пропускаем, если это тип последней задачи (чтобы не повторяться)
        if (lastTaskType && taskTypeItem.type === lastTaskType) continue;

        cumulativeProbability += taskTypeItem.probability;

        // Проверка жесткого лимита (например, не более 35% одного типа)
        const currentCount = taskTypeCounts[taskTypeItem.type] || 0;
        if (totalCurrentTasks > 0 && currentCount / totalCurrentTasks > 0.35) {
          continue; // Пропускаем этот тип, если лимит превышен
        }

        if (random < cumulativeProbability) {
          return taskTypeItem.type; // Возвращаем выбранный тип
        }
      }

      // Если цикл завершился без выбора (например, все типы заблокированы),
      // сбрасываем cumulativeProbability и пробуем снова (до maxAttempts)
      // Это может произойти, если все вероятности очень малы или заблокированы.
    }

    // Если не смогли выбрать за maxAttempts, выбираем наиболее подходящий доступный тип
    // (тот, который разрешен флагом и не превышает жесткий лимит)
    for (const taskTypeItem of availableTaskTypes) {
      if (!taskTypeItem.flag) continue;
      const currentCount = taskTypeCounts[taskTypeItem.type] || 0;
      if (!(totalCurrentTasks > 0 && currentCount / totalCurrentTasks > 0.35)) {
        return taskTypeItem.type;
      }
    }

    // Крайний случай: если все типы заблокированы, возвращаем flashcard как fallback
    return 'flashcard';
    // -----------------
  }

  /**
   * Проверяет, можно ли использовать задачу для данных символов.
   * Для комбинаций разрешаем повторять разные типы задач.
   * Для одиночных символов проверяем по типу задачи.
   * Используется старая логика из оригинала, но можно улучшить.
   */
  private isTaskAlreadyUsed(
    combinationKey: string,
    taskType: string,
    usedTaskTypesBySymbol: Map<number, Set<string>>,
    symbols: KanaLessonSymbolWithProgress[],
  ): boolean {
    // В оригинале для комбинаций не было строгой проверки на повторы разных типов
    // if (symbols.length > 1) {
    //   return false;
    // }
    // Для одиночных символов проверка остается
    if (symbols.length === 1) {
      const symbolId = symbols[0].id;
      const usedTasks = usedTaskTypesBySymbol.get(symbolId);
      return usedTasks ? usedTasks.has(taskType) : false;
    }
    // Для комбинаций можно сделать более простую проверку, например, по ключу комбинации и типу
    // Но в оригинале это не было строго реализовано. Оставим false для совместимости.
    // Если будет нужно строго избегать повторов комбинаций, логику можно усложнить.
    return false;
  }

  /**
   * Выбирает символы с учетом ограничений на повторения.
   * Эта логика больше подходит для одиночных символов.
   * Для комбинаций используется generateValidCombinationWithoutRepeats.
   */
  private selectSymbolsWithoutRepeats(
    allSymbols: KanaLessonSymbolWithProgress[],
    usedSymbols: Set<number>,
    usedTaskTypesBySymbol: Map<number, Set<string>>,
    taskType: string,
  ): KanaLessonSymbolWithProgress[] {
    // Сначала пробуем выбрать символы, которые еще не использовались для этой задачи
    const unusedSymbols = allSymbols.filter((symbol) => {
      const usedTasks = usedTaskTypesBySymbol.get(symbol.id);
      return !usedTasks || !usedTasks.has(taskType);
    });

    if (unusedSymbols.length > 0) {
      return [this.utils.getRandomElement(unusedSymbols)];
    }

    // Если все символы уже использовались, выбираем случайный
    return allSymbols.length > 0
      ? [this.utils.getRandomElement(allSymbols)]
      : [];
  }

  /**
   * Генерирует задачи с комбинациями.
   */
  private generateCombinationTasks(
    symbols: KanaLessonSymbolWithProgress[],
    maxCombinationLength: number,
    count: number,
    currentTasksInLesson: KanaLessonTask[],
    usedSymbols: Set<number>,
    usedSymbolCombinations: Set<string>,
    usedTaskTypesBySymbol: Map<number, Set<string>>,
  ): KanaLessonTask[] {
    const tasks: KanaLessonTask[] = [];
    const allSymbolsWithProgress = [...symbols];

    // Генерируем комбинации
    for (
      let i = 0;
      i < count && symbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS;
      i++
    ) {
      if (!this.canUseCombinations(symbols, currentTasksInLesson)) {
        break; // Прерываем, если нельзя использовать комбинации
      }

      const combination = this.generateValidCombinationWithoutRepeats(
        symbols,
        maxCombinationLength,
        currentTasksInLesson,
        usedSymbolCombinations,
      );

      if (combination.length === 0) {
        continue; // Пропускаем, если не смогли сгенерировать комбинацию
      }

      // Выбираем случайный тип задачи для комбинаций
      const taskTypes = [
        'kana-recognition',
        'kana-audio',
        'kana-writing',
        'flashcard',
      ];
      const randomTaskType = this.utils.getRandomElement(taskTypes);
      let task: KanaLessonTask | null = null;

      switch (randomTaskType) {
        case 'kana-recognition':
          task = this.taskFactory.createTask(
            'kana-recognition',
            combination,
            allSymbolsWithProgress,
          );
          break;
        case 'kana-audio':
          task = this.taskFactory.createTask(
            'kana-audio',
            combination,
            allSymbolsWithProgress,
          );
          break;
        case 'kana-writing':
          task = this.taskFactory.createTask(
            'kana-writing',
            combination,
            allSymbolsWithProgress,
          );
          break;
        case 'flashcard':
          task = this.taskFactory.createTask(
            'flashcard',
            combination,
            allSymbolsWithProgress,
          );
          break;
      }

      if (task) {
        tasks.push(task);
        // Отмечаем символы и задачи как использованные
        combination.forEach((symbol) => {
          usedSymbols.add(symbol.id);
          // Для комбинаций не добавляем конкретный тип задачи к каждому символу,
          // так как проверка на повторы для комбинаций другая.
          // this.addUsedTaskType(usedTaskTypesBySymbol, symbol.id, randomTaskType);
        });
        usedSymbolCombinations.add(this.getSymbolCombinationKey(combination));
      }
    }

    return tasks;
  }

  /**
   * Проверяет, можно ли использовать комбинации символов.
   * Комбинации разрешены только если все символы имеют прогресс > 0
   * или для символов с прогрессом 0 уже были задачи kana-audio или kana-reverse-recognition.
   */
  private canUseCombinations(
    symbols: KanaLessonSymbolWithProgress[],
    currentTasksInLesson: KanaLessonTask[], // Список уже добавленных задач в текущем уроке
  ): boolean {
    return symbols.every((symbol) => {
      // Если символ уже изучен (прогресс > 0), можно использовать в комбинации
      if (symbol.progress > 0) {
        return true;
      }

      // Для новых символов (прогресс = 0) проверяем, были ли уже добавлены базовые задачи В ЭТОМ уроке
      // Проверяем, есть ли в currentTasksInLesson задача для этого symbol.id типа 'kana-audio' или 'kana-reverse-recognition'
      const isUnlockedInThisLesson = currentTasksInLesson.some(
        (task) =>
          task.symbols?.some((s) => s.id === symbol.id) &&
          (task.taskType === 'kana-audio' ||
            task.taskType === 'kana-reverse-recognition'),
      );

      return isUnlockedInThisLesson;
    });
  }

  /**
   * Генерирует валидную комбинацию символов без повторений (с учетом уже использованных комбинаций).
   */
  private generateValidCombinationWithoutRepeats(
    symbols: KanaLessonSymbolWithProgress[],
    maxCombinationLength: number,
    currentTasksInLesson: KanaLessonTask[],
    usedSymbolCombinations: Set<string>,
  ): KanaLessonSymbolWithProgress[] {
    // Фильтруем символы, которые можно использовать в комбинациях
    const validSymbols = symbols.filter((symbol) => {
      if (symbol.progress > 0) {
        return true;
      }
      // Для новых символов (прогресс = 0) проверяем, были ли уже добавлены базовые задачи В ЭТОМ уроке
      // Проверяем, есть ли в currentTasksInLesson задача для этого symbol.id типа 'kana-audio' или 'kana-reverse-recognition'
      const isUnlockedInThisLesson = currentTasksInLesson.some(
        (task) =>
          task.symbols?.some((s) => s.id === symbol.id) &&
          (task.taskType === 'kana-audio' ||
            task.taskType === 'kana-reverse-recognition'),
      );

      return isUnlockedInThisLesson;
    });

    if (validSymbols.length < 2) {
      return [];
    }

    const maxAttempts = 20;
    let attempts = 0;
    while (attempts < maxAttempts) {
      // Генерируем случайную длину комбинации от 2 до maxCombinationLength или количества валидных символов
      const combinationLength = Math.min(
        Math.max(
          2,
          Math.floor(Math.random() * Math.min(maxCombinationLength, 3)) + 2,
        ),
        maxCombinationLength,
        validSymbols.length,
      );
      const combination = this.utils.getRandomElements(
        validSymbols,
        combinationLength,
      );
      const combinationKey = this.getSymbolCombinationKey(combination);

      // Проверяем, не использовалась ли уже эта комбинация
      if (!usedSymbolCombinations.has(combinationKey)) {
        return combination;
      }
      attempts++;
    }

    // Если не смогли сгенерировать уникальную комбинацию, возвращаем пустой массив
    return [];
  } // --- Конец вспомогательных методов ---
}
