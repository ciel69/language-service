// src/lesson/service/kana-lesson-generator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SrsService } from '@/services/srs.service';
import { BaseLessonGeneratorService } from '../base-lesson-generator.service';
import { LessonUtilsService } from '../lesson-utils.service';
import { KanaTaskFactoryService } from './kana-task-factory.service';
import {
  KanaLessonSymbolWithProgress,
  KanaLessonTask,
  GeneratedKanaLesson,
  KanaLessonGenerationConfig,
} from '../lesson.types';
import { KanaLessonSymbol } from '@/modules/kana/kana.service';

interface TaskTypeConfig {
  probability: number;
  needsUnlockedSymbols: boolean;
  minSymbols: number;
  maxSymbols: number;
  priority: number;
  required: boolean;
  alwaysFirstForNewSymbols?: boolean;
}

@Injectable()
export class KanaLessonGeneratorService extends BaseLessonGeneratorService<
  KanaLessonSymbol,
  KanaLessonTask
> {
  private readonly logger = new Logger(KanaLessonGeneratorService.name);
  private readonly MAX_FILL_ATTEMPTS = 100;
  // Расширенная конфигурация типов задач
  private readonly TASK_TYPE_CONFIG: Record<string, TaskTypeConfig> = {
    'kana-audio': {
      probability: 0.1,
      needsUnlockedSymbols: false,
      minSymbols: 1,
      maxSymbols: 1,
      priority: 1,
      required: true,
      alwaysFirstForNewSymbols: true,
    },
    'kana-reverse-recognition': {
      probability: 0.15,
      needsUnlockedSymbols: false,
      minSymbols: 1,
      maxSymbols: 1,
      priority: 0,
      required: true,
    },
    'kana-recognition': {
      probability: 0.15,
      needsUnlockedSymbols: false,
      minSymbols: 2,
      maxSymbols: 4,
      priority: 0,
      required: true,
    },
    'kana-writing': {
      probability: 0.1,
      needsUnlockedSymbols: false,
      minSymbols: 2,
      maxSymbols: 4,
      priority: 0,
      required: true,
    },
    'kana-stroke-order': {
      probability: 0.3,
      needsUnlockedSymbols: false,
      minSymbols: 1,
      maxSymbols: 1,
      priority: 0,
      required: true,
    },
    pairing: {
      probability: 0.1,
      needsUnlockedSymbols: false,
      minSymbols: 2,
      maxSymbols: 4,
      priority: 0,
      required: true,
    },
    flashcard: {
      probability: 0.05,
      needsUnlockedSymbols: false,
      minSymbols: 1,
      maxSymbols: 1,
      priority: 0,
      required: false,
    },
    'kana-combination': {
      probability: 0.15,
      needsUnlockedSymbols: true,
      minSymbols: 2,
      maxSymbols: 4,
      priority: 0,
      required: true,
    },
  };

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

    // 1. Обработка задач с приоритетом (alwaysFirstForNewSymbols)
    this.generatePriorityTasks(
      tasks,
      symbolsWithProgress,
      allSymbolsWithProgress,
      usedSymbols,
      usedTaskTypesBySymbol,
    );

    // 2. Генерация обязательных задач (по одной каждого required типа)
    this.generateRequiredTasks(
      tasks,
      allSymbolsWithProgress,
      symbolsWithProgress,
      learnedSymbolsWithProgress,
      usedSymbols,
      usedTaskTypesBySymbol,
      usedSymbolCombinations,
      maxCombinationLength,
      availableSymbols,
    );

    // 3. Заполнение урока до нужного количества задач
    this.fillRemainingTasks(
      tasks,
      taskCount,
      allSymbolsWithProgress,
      symbolsWithProgress,
      learnedSymbolsWithProgress,
      usedSymbols,
      usedTaskTypesBySymbol,
      usedSymbolCombinations,
      maxCombinationLength,
      availableSymbols,
    );

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

  // Генерация задач с приоритетом (например, kana-audio для новых символов)
  private generatePriorityTasks(
    tasks: KanaLessonTask[],
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
    allSymbolsWithProgress: KanaLessonSymbolWithProgress[],
    usedSymbols: Set<number>,
    usedTaskTypesBySymbol: Map<number, Set<string>>,
  ): void {
    Object.entries(this.TASK_TYPE_CONFIG).forEach(([taskType, config]) => {
      if (config.alwaysFirstForNewSymbols) {
        for (const symbol of symbolsWithProgress) {
          const task = this.taskFactory.createTask(
            taskType,
            [symbol],
            allSymbolsWithProgress,
          );
          if (task) {
            tasks.push(task);
            usedSymbols.add(symbol.id);
            this.addUsedTaskType(usedTaskTypesBySymbol, symbol.id, taskType);
          }
        }
      }
    });
  }

  // Генерация обязательных задач (по одной каждого required типа)
  private generateRequiredTasks(
    tasks: KanaLessonTask[],
    allSymbolsWithProgress: KanaLessonSymbolWithProgress[],
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
    learnedSymbolsWithProgress: KanaLessonSymbolWithProgress[],
    usedSymbols: Set<number>,
    usedTaskTypesBySymbol: Map<number, Set<string>>,
    usedSymbolCombinations: Set<string>,
    maxCombinationLength: number,
    availableSymbols: KanaLessonSymbol[],
  ): void {
    const requiredTaskTypes = Object.entries(this.TASK_TYPE_CONFIG)
      .filter(([, config]) => config.required)
      .sort(([, a], [, b]) => b.priority - a.priority);

    for (const [taskType, config] of requiredTaskTypes) {
      // Проверяем, есть ли уже задачи этого типа
      const hasTaskOfType = tasks.some((task) => task.taskType === taskType);
      if (hasTaskOfType) continue;

      // // Специальная обработка для pairing
      if (taskType === 'pairing') {
        const task = this.taskFactory.createTask(
          taskType,
          [],
          allSymbolsWithProgress,
          config,
        );
        if (task) tasks.push(task);
        continue;
      }

      // Определяем, является ли задача комбинацией по minSymbols > 1
      const isCombinationTask = config.minSymbols > 1;

      // Обработка комбинационных задач
      if (isCombinationTask) {
        const combination = this.generateValidCombinationWithoutRepeats(
          allSymbolsWithProgress,
          maxCombinationLength,
          tasks,
          usedSymbolCombinations,
        );

        if (combination.length > 0) {
          const task = this.taskFactory.createTask(
            taskType,
            combination,
            allSymbolsWithProgress,
          );
          if (task) {
            tasks.push(task);
            combination.forEach((symbol) => {
              usedSymbols.add(symbol.id);
            });
            usedSymbolCombinations.add(
              this.getSymbolCombinationKey(combination),
            );
          }
        }
        continue;
      }

      // Обычная генерация для остальных типов
      const selectedSymbols = this.selectSymbolsForTaskType(
        taskType,
        config,
        allSymbolsWithProgress,
        symbolsWithProgress,
        usedTaskTypesBySymbol,
      );

      if (selectedSymbols.length > 0) {
        const task = this.taskFactory.createTask(
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
        }
      }
    }
  }

  // Заполнение оставшихся слотов в уроке
  private fillRemainingTasks(
    tasks: KanaLessonTask[],
    targetTaskCount: number,
    allSymbolsWithProgress: KanaLessonSymbolWithProgress[],
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
    learnedSymbolsWithProgress: KanaLessonSymbolWithProgress[],
    usedSymbols: Set<number>,
    usedTaskTypesBySymbol: Map<number, Set<string>>,
    usedSymbolCombinations: Set<string>,
    maxCombinationLength: number,
    availableSymbols: KanaLessonSymbol[],
  ): void {
    let attempts = 0;

    while (
      tasks.length < targetTaskCount &&
      attempts < this.MAX_FILL_ATTEMPTS
    ) {
      attempts++;

      const taskType = this.selectTaskTypeWithProgressAwareness(
        {}, // config
        symbolsWithProgress,
        tasks,
      );

      const config = this.TASK_TYPE_CONFIG[taskType];
      if (!config) continue;

      let selectedSymbols: KanaLessonSymbolWithProgress[] = [];
      const isCombinationTask = config.minSymbols > 1;

      // Генерация комбинаций
      if (isCombinationTask) {
        selectedSymbols = this.generateValidCombinationWithoutRepeats(
          allSymbolsWithProgress,
          maxCombinationLength,
          tasks,
          usedSymbolCombinations,
        );
      } else {
        // Обычный выбор символов
        selectedSymbols = this.selectSymbolsForTaskType(
          taskType,
          config,
          allSymbolsWithProgress,
          symbolsWithProgress,
          usedTaskTypesBySymbol,
        );
      }

      // Fallback если не удалось выбрать уникальные символы
      if (selectedSymbols.length === 0 && allSymbolsWithProgress.length > 0) {
        if (
          isCombinationTask &&
          availableSymbols.length >= this.MIN_SYMBOLS_FOR_COMBINATIONS
        ) {
          selectedSymbols = this.generateValidCombinationWithoutRepeats(
            allSymbolsWithProgress,
            maxCombinationLength,
            tasks,
            usedSymbolCombinations,
          );
        }

        if (selectedSymbols.length === 0) {
          // Попытка выбрать любой доступный символ
          const fallbackSymbols = allSymbolsWithProgress.filter((symbol) => {
            const usedTasks = usedTaskTypesBySymbol.get(symbol.id);
            return !usedTasks || !usedTasks.has(taskType);
          });

          if (fallbackSymbols.length > 0) {
            selectedSymbols = [this.utils.getRandomElement(fallbackSymbols)];
          } else {
            selectedSymbols = [
              this.utils.getRandomElement(allSymbolsWithProgress),
            ];
          }
        }
      }

      if (selectedSymbols.length > 0) {
        const task = this.taskFactory.createTask(
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

          if (isCombinationTask) {
            usedSymbolCombinations.add(
              this.getSymbolCombinationKey(selectedSymbols),
            );
          }

          // Сброс счетчика попыток при успешном создании задачи
          attempts = 0;
        }
      }

      // Добавляем проверку на отсутствие прогресса
      if (selectedSymbols.length === 0) {
        // Если слишком много неудачных попыток, выходим
        if (attempts > 50) break;
      }
    }
  }

  // Выбор символов для конкретного типа задачи
  private selectSymbolsForTaskType(
    taskType: string,
    config: TaskTypeConfig,
    allSymbols: KanaLessonSymbolWithProgress[],
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
    usedTaskTypesBySymbol: Map<number, Set<string>>,
  ): KanaLessonSymbolWithProgress[] {
    if (config.minSymbols === 0) {
      return [];
    }

    // Сначала пробуем выбрать символы, которые еще не использовались для этой задачи
    const unusedSymbols = allSymbols.filter((symbol) => {
      const usedTasks = usedTaskTypesBySymbol.get(symbol.id);
      return !usedTasks || !usedTasks.has(taskType);
    });

    const availableSymbols =
      unusedSymbols.length > 0 ? unusedSymbols : allSymbols;
    if (availableSymbols.length === 0) {
      return [];
    }

    const symbolCount = Math.max(config.minSymbols, 1);

    // Для новых символов отдаем приоритет
    if (symbolsWithProgress.length > 0) {
      const symbol = this.utils.getRandomElement(symbolsWithProgress);
      return [symbol];
    }

    return symbolCount === 1
      ? [this.utils.getRandomElement(availableSymbols)]
      : this.utils.getRandomElements(
          availableSymbols,
          Math.min(symbolCount, availableSymbols.length),
        );
  }

  // --- Остальные методы остаются без изменений ---
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

  protected selectTaskTypeWithProgressAwareness(
    config: KanaLessonGenerationConfig,
    symbolsWithProgress: KanaLessonSymbolWithProgress[],
    currentTasksInLesson: KanaLessonTask[],
  ): string {
    const avgProgress =
      symbolsWithProgress.length > 0
        ? symbolsWithProgress.reduce(
            (sum, symbol) => sum + symbol.progress,
            0,
          ) / symbolsWithProgress.length
        : 0;

    const adjustedConfig = this.adjustProbabilitiesByProgress(avgProgress);
    const finalConfig = this.adjustProbabilitiesByLessonContext(
      adjustedConfig,
      currentTasksInLesson,
    );

    // Фильтруем только доступные типы задач
    const availableTaskTypes = Object.entries(finalConfig)
      .filter(
        ([type, typeConfig]) =>
          this.isTaskTypeAvailable(type, typeConfig, finalConfig) &&
          typeConfig.probability > 0,
      )
      .map(([type, typeConfig]) => ({
        type,
        probability: Number(typeConfig.probability),
        config: typeConfig,
      }));

    // Если нет доступных типов, возвращаем дефолтный
    if (availableTaskTypes.length === 0) {
      return 'flashcard';
    }

    return this.selectWeightedRandom(availableTaskTypes);
  }

  private adjustProbabilitiesByProgress(avgProgress: number) {
    const config = { ...this.TASK_TYPE_CONFIG };

    if (avgProgress <= 10) {
      config.pairing.probability = 0.03;
      config['kana-combination'].probability = 0.05;
    } else if (avgProgress <= 30) {
      config.pairing.probability = 0.05;
      config['kana-combination'].probability = 0.07;
    }

    if (avgProgress >= 40) {
      config['kana-audio'].probability = 0.02;
      config['kana-recognition'].probability = 0.2;
      config['kana-reverse-recognition'].probability = 0.2;
      config['kana-stroke-order'].probability = 0.15;
      config['kana-writing'].probability = 0.15;
      config.flashcard.probability = 0.1;
      config['kana-combination'].probability = 0.1;
    }

    return config;
  }

  private adjustProbabilitiesByLessonContext(
    config: Record<string, TaskTypeConfig>,
    currentTasksInLesson: KanaLessonTask[],
  ) {
    const finalConfig = { ...config };
    const taskTypeCounts: Record<string, number> = {};

    currentTasksInLesson.forEach((task) => {
      taskTypeCounts[task.taskType] = (taskTypeCounts[task.taskType] || 0) + 1;
    });

    const totalCurrentTasks = currentTasksInLesson.length;

    if (totalCurrentTasks > 0) {
      Object.entries(finalConfig).forEach(([taskType, typeConfig]) => {
        const currentCount = taskTypeCounts[taskType] || 0;
        const currentRatio = currentCount / totalCurrentTasks;
        const expectedRatio = typeConfig.probability;

        if (currentRatio > expectedRatio * 2.0) {
          finalConfig[taskType].probability *= 0.1;
        } else if (currentRatio > expectedRatio * 1.5) {
          finalConfig[taskType].probability *= 0.5;
        }
      });
    }

    return finalConfig;
  }

  private isTaskTypeAvailable(
    type: string,
    config: TaskTypeConfig,
    finalConfig: { [x: string]: TaskTypeConfig },
  ): boolean {
    return config.probability > 0;
  }

  private selectWeightedRandom(
    availableTaskTypes: Array<{
      type: string;
      probability: number;
      config: any;
    }>,
  ): string {
    if (availableTaskTypes.length === 0) {
      return 'flashcard';
    }

    const totalProbability = availableTaskTypes.reduce(
      (sum, item) => sum + item.probability,
      0,
    );

    if (totalProbability <= 0) {
      return availableTaskTypes[0].type;
    }

    const random = Math.random() * totalProbability;
    let cumulative = 0;

    for (const item of availableTaskTypes) {
      cumulative += item.probability;
      if (random <= cumulative) {
        return item.type;
      }
    }

    return availableTaskTypes[availableTaskTypes.length - 1].type;
  }

  private generateValidCombinationWithoutRepeats(
    symbols: KanaLessonSymbolWithProgress[],
    maxCombinationLength: number,
    currentTasksInLesson: KanaLessonTask[],
    usedSymbolCombinations: Set<string>,
  ): KanaLessonSymbolWithProgress[] {
    const validSymbols = symbols.filter((symbol) => {
      if (symbol.progress > 0) {
        return true;
      }
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

      if (!usedSymbolCombinations.has(combinationKey)) {
        return combination;
      }
      attempts++;
    }

    return [];
  }
}
