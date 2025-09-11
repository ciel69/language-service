// src/lesson/service/base-lesson-generator.service.ts
import { Injectable } from '@nestjs/common';
import { SrsService } from '@/services/srs.service';
import { LessonUtilsService } from './lesson-utils.service';
import {
  BaseLessonSymbol,
  BaseLessonSymbolWithProgress,
  BaseLessonTask,
  BaseLessonGenerationConfig,
} from './lesson.types';

@Injectable()
export abstract class BaseLessonGeneratorService<
  TSymbol extends BaseLessonSymbol,
  TTask extends BaseLessonTask,
> {
  protected taskIdCounter = 1;
  protected readonly DEFAULT_MAX_COMBINATION_LENGTH = 2;
  protected readonly MIN_SYMBOLS_FOR_COMBINATIONS = 2;

  constructor(
    protected readonly srsService: SrsService,
    protected readonly utils: LessonUtilsService,
  ) {}

  protected abstract createSymbolWithProgress(
    symbol: TSymbol,
    progress?: number,
    configProgress?: Record<number, number>,
  ): BaseLessonSymbolWithProgress & TSymbol;

  protected abstract selectTaskTypeWithProgressAwareness(
    config: BaseLessonGenerationConfig,
    symbolsWithProgress: (BaseLessonSymbolWithProgress & TSymbol)[],
    currentTasksInLesson: TTask[],
  ): string;

  protected addUsedTaskType(
    usedTaskTypesBySymbol: Map<number, Set<string>>,
    symbolId: number,
    taskType: string,
  ): void {
    if (!usedTaskTypesBySymbol.has(symbolId)) {
      usedTaskTypesBySymbol.set(symbolId, new Set<string>());
    }
    usedTaskTypesBySymbol.get(symbolId)!.add(taskType);
  }

  protected getSymbolCombinationKey(
    symbols: (BaseLessonSymbolWithProgress & TSymbol)[],
  ): string {
    return this.utils.getSymbolCombinationKey(symbols);
  }

  protected determineTaskCount(symbolCount: number): number {
    return this.utils.determineTaskCount(symbolCount);
  }

  protected estimateLessonDuration(tasks: TTask[]): number {
    return this.utils.estimateLessonDuration(tasks);
  }

  /**
   * Генерирует уникальный ID для задачи.
   * @returns Уникальный ID.
   */
  protected generateTaskId(): number {
    return this.taskIdCounter++;
  }
}
