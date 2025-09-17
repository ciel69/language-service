// src/lesson/factory/lesson-factory.service.ts
import { Injectable, Logger } from '@nestjs/common';
// --- Импортируйте нужные сервисы ---
import { KanaService } from '@/modules/kana/kana.service';
import { KanjiService } from '@/modules/kanji/kanji.service';

import { KanaLessonGeneratorService } from '@/modules/lesson/services/kana/kana-lesson-generator.service';
import { KanjiLessonGeneratorService } from '@/modules/lesson/services/kanji/kanji-lesson-generator.service';
import { LessonService } from '@/modules/lesson/lesson.service'; // Для курсов
import {
  LessonCompletionData,
  LessonResult,
  LessonType,
} from './lesson-result.interface';
import { UserService } from '@/modules/user/user.service'; // Для инвалидации кэша

@Injectable()
export class LessonFactoryService {
  private readonly logger = new Logger(LessonFactoryService.name);

  constructor(
    // --- Внедряем нужные сервисы ---
    private readonly kanaService: KanaService, // <---
    private readonly kanjiService: KanjiService, // <---
    // --- --- ---
    private readonly kanaLessonGeneratorService: KanaLessonGeneratorService,
    private readonly kanjiLessonGeneratorService: KanjiLessonGeneratorService,
    private readonly lessonService: LessonService, // Для курсов
    private readonly userService: UserService, // Для инвалидации кэша
  ) {}

  /**
   * Получает/генерирует урок в зависимости от типа.
   * @param type Тип урока ('kana', 'kanji', 'course')
   * @param params Параметры, специфичные для типа урока
   * @returns Promise<LessonResult>
   */
  async getLesson<T>(type: LessonType, params: any): Promise<LessonResult<T>> {
    this.logger.log(`Запрос урока типа: ${type}`);

    switch (type) {
      case 'kana': {
        // params: { id: number, typeKana: 'hiragana' | 'katakana', config?: any }
        // --- Вызываем getLessonPlan напрямую у внедренного сервиса ---
        const res = await this.kanaService.getLessonPlan(
          params.id,
          params.typeKana,
          7,
        ); // <---
        const config = params.config || { includeCombinations: true };
        const generatedLesson =
          await this.kanaLessonGeneratorService.generateKanaLesson(
            res.symbols,
            res.learnedSymbols, // Предполагается, что learnedSymbols пусты или берутся из res
            config,
          );
        return {
          lessonId: generatedLesson.lessonId, // Или какой-то ID из res
          type: 'kana',
          data: generatedLesson as T,
        };
      }

      case 'kanji': {
        // params: { packId: number, userId: number, config?: any }
        // --- Вызываем getLessonPlan напрямую у внедренного сервиса ---
        const lessonPlan = await this.kanjiService.getLessonPlan(
          params.userId,
          params.packId,
        ); // <---
        const config = params.config || {
          includeWritingTasks: true,
          includeAudioTasks: true,
          includeMeaningTasks: true,
          includeReadingTasks: true,
          includeCompoundsTasks: true,
          includeStrokeOrderTasks: true,
        };
        const generatedLesson =
          await this.kanjiLessonGeneratorService.generateKanjiLesson(
            lessonPlan.symbolsToLearn,
            lessonPlan.learnedSymbols,
            lessonPlan.srsProgressMap,
            config,
          );
        return {
          lessonId: generatedLesson.lessonId, // Или какой-то ID из lessonPlan
          type: 'kanji',
          data: generatedLesson as T,
        };
      }

      case 'course': {
        // params: { moduleId: number, userKeycloakId: string }
        const moduleData =
          await this.lessonService.getStartDataForModuleOptimized(
            params.moduleId,
            params.userKeycloakId,
          );
        // Предположим, что moduleData.module содержит данные урока
        // lessonId будет ID модуля или урока внутри него
        const lessonId = moduleData.module?.lessons?.[0]?.id || params.moduleId;
        return {
          lessonId: String(lessonId),
          type: 'course',
          data: moduleData as T,
        };
      }

      default:
        throw new Error(`Неизвестный тип урока: ${type}`);
    }
  }

  /**
   * Завершает урок и выполняет необходимые действия, например, инвалидацию кэша.
   * @param completionData Данные о завершении урока
   */
  async completeLesson(completionData: LessonCompletionData): Promise<void> {
    this.logger.log(
      `Завершение урока для пользователя: ${completionData.userKeycloakId}`,
    );

    // --- Инвалидация кэша пользователя ---
    // Это ключевое место для решения вашей проблемы.
    try {
      await this.userService.invalidateUserCache(completionData.userKeycloakId);
      this.logger.debug(
        `Кэш пользователя ${completionData.userKeycloakId} успешно инвалидирован после завершения урока.`,
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при инвалидации кэша пользователя ${completionData.userKeycloakId}:`,
        error.stack,
      );
      // В зависимости от требований, можно пробросить ошибку или просто залогировать
    }

    // --- Другая логика завершения ---
    // Здесь можно добавить вызовы других сервисов, например, для обновления SRS,
    // сохранения прогресса урока и т.д.
    // Например:
    // await this.progressService.updateLessonProgress(completionData.userKeycloakId, completionData.lessonId, ...);
    // await this.achievementService.checkAndGrantAchievements(completionData.userKeycloakId, ...);
  }
}
