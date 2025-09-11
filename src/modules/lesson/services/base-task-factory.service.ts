// src/lesson/service/base-task-factory.service.ts
import { Injectable } from '@nestjs/common';
import { LessonUtilsService } from './lesson-utils.service';
import { BaseLessonSymbolWithProgress, BaseLessonTask } from './lesson.types';

/**
 * Абстрактная фабрика для создания задач.
 * @template TSymbol - Тип символа (например, KanaLessonSymbolWithProgress).
 * @template TTask - Тип задачи (например, KanaLessonTask).
 */
@Injectable()
export abstract class BaseTaskFactoryService<
  TSymbol extends BaseLessonSymbolWithProgress,
  TTask extends BaseLessonTask,
> {
  protected taskIdCounter = 1;

  constructor(protected readonly utils: LessonUtilsService) {}

  /**
   * Абстрактный метод для создания конкретной задачи.
   * @param taskType - Тип задачи для создания.
   * @param symbols - Символы, используемые в задаче.
   * @param allSymbols - Все доступные символы (для генерации опций).
   * @param config - Дополнительная конфигурация.
   * @returns Созданная задача или null.
   */
  protected abstract createTask(
    taskType: string,
    symbols: TSymbol[],
    allSymbols: TSymbol[],
    config?: Record<string, any>,
  ): TTask | null;

  /**
   * Генерирует уникальный ID для задачи.
   * @returns Уникальный ID.
   */
  protected generateTaskId(): number {
    return this.taskIdCounter++;
  }

  /**
   * Универсальный метод для перемешивания задач с предотвращением дубликатов определенных типов.
   * Эта логика действительно общая.
   * @param tasks Массив задач для перемешивания.
   * @param avoidConsecutiveTypes Массив типов задач, которые не должны идти подряд.
   * @returns Перемешанный массив задач.
   */
  shuffleTasks(tasks: TTask[], avoidConsecutiveTypes?: string[]): TTask[] {
    if (tasks.length <= 1) {
      return [...tasks];
    }

    const typesToAvoid = avoidConsecutiveTypes || [];
    if (typesToAvoid.length === 0) {
      const shuffled = [...tasks];
      this.utils.shuffleArray(shuffled);
      return shuffled;
    }

    const shuffledTasks = [...tasks];
    this.utils.shuffleArray(shuffledTasks);

    for (const avoidType of typesToAvoid) {
      for (let i = 1; i < shuffledTasks.length; i++) {
        if (
          shuffledTasks[i].taskType === avoidType &&
          shuffledTasks[i - 1].taskType === avoidType
        ) {
          for (let j = i + 1; j < shuffledTasks.length; j++) {
            if (shuffledTasks[j].taskType !== avoidType) {
              [shuffledTasks[i], shuffledTasks[j]] = [
                shuffledTasks[j],
                shuffledTasks[i],
              ];
              break;
            }
          }
          // Поиск с начала, если не нашли в конце
          if (
            shuffledTasks[i].taskType === avoidType &&
            shuffledTasks[i - 1].taskType === avoidType
          ) {
            for (let j = 0; j < i - 1; j++) {
              if (shuffledTasks[j].taskType !== avoidType) {
                [shuffledTasks[i], shuffledTasks[j]] = [
                  shuffledTasks[j],
                  shuffledTasks[i],
                ];
                break;
              }
            }
          }
        }
      }
    }

    return shuffledTasks;
  }

  // Другие общие вспомогательные методы для фабрик могут быть добавлены здесь
  // Например, методы для отслеживания использованных задач, если это нужно на уровне фабрики
}
