import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, QueryRunner, Repository } from 'typeorm';

import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson } from '@/modules/lesson/entities/lesson.entity';
import { LessonTask } from '@/modules/lesson/entities/lesson-task.entity';
import { LessonModule } from '@/modules/lesson/entities/lesson-module.entity';
import { LessonProgress } from '@/modules/progress/entities/lesson-progress.entity';
import { Kana } from '@/modules/kana/entities/kana.entity';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { Word } from '@/modules/word/entities/word.entity';
import { Grammar } from '@/modules/grammar/entities/grammar.entity';

export interface OptimizedModuleData {
  module: LessonModule;
}

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(LessonModule)
    private readonly lessonModuleRepository: Repository<LessonModule>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonTask)
    private readonly lessonTaskRepository: Repository<LessonTask>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    private dataSource: DataSource, // Для использования QueryRunner если нужно
  ) {}

  // todo провести рефакторинг
  /**
   * Оптимизированный метод получения данных для начала урока.
   * Старается минимизировать количество запросов к БД.
   * @param lessonModuleId ID модуля урока.
   * @param userId ID пользователя.
   * @returns Promise<OptimizedModuleData>
   */
  async getStartDataForModuleOptimized(
    lessonModuleId: number,
    userId: number,
  ): Promise<OptimizedModuleData> {
    this.logger.log(
      `Оптимизированный запрос данных для начала урока в модуле ID ${lessonModuleId} для пользователя ID ${userId}`,
    );

    // --- 1. Проверяем существование модуля ---
    const module = await this.lessonModuleRepository.findOne({
      where: { id: lessonModuleId },
    });

    if (!module) {
      throw new NotFoundException(
        `LessonModule с ID ${lessonModuleId} не найден.`,
      );
    }

    // --- 2. Используем QueryBuilder для сложного запроса с фильтрацией ---
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // --- 2a. Запрашиваем только первый подходящий урок ---
      const lessonWithTasks = await this.lessonRepository
        .createQueryBuilder('lesson')
        .innerJoinAndSelect('lesson.tasks', 'task')
        .innerJoin(LessonTask, 'task_check', 'task_check.lessonId = lesson.id')
        .leftJoinAndSelect(
          LessonProgress,
          'progress',
          'progress.lessonId = lesson.id AND progress.userId = :userId',
          { userId },
        )
        .where('lesson.moduleId = :moduleId', {
          moduleId: lessonModuleId,
        })
        .groupBy('lesson.id, task.id, progress.id')
        .having(
          'progress.id IS NULL OR MAX(progress.progress) < :fullProgress',
          { fullProgress: 100 },
        )
        .orderBy('lesson.order', 'ASC')
        .addOrderBy('task.order', 'ASC')
        .getOne();

      if (!lessonWithTasks) {
        this.logger.log(
          `Модуль ID ${lessonModuleId} не имеет подходящих урокаов (без задач или с прогрессом 100%) для пользователя ID ${userId}.`,
        );
        return { module };
      }

      // --- 3. Подготавливаем структуру модуля с одним уроком ---
      const moduleWithData = {
        ...module,
        lessons: [lessonWithTasks],
      };

      // --- 4. Собираем taskId по типам ---
      const taskTypeToIdsMap = this.buildTaskTypeToIdsMap(
        lessonWithTasks.tasks,
      );

      // --- 5. Загружаем данные для каждого типа задач параллельно ---
      const loadedDataTaskMap = await this.loadTaskDataByTypes(
        queryRunner,
        taskTypeToIdsMap,
      );

      // --- 6. Прикрепляем загруженные данные к задачам ---
      this.attachTaskDataToTasks(
        lessonWithTasks.tasks,
        loadedDataTaskMap,
        taskTypeToIdsMap,
      );

      this.logger.log(
        `Оптимизированный запрос для модуля ID ${lessonModuleId} завершен. Найден урок: ${lessonWithTasks.id}`,
      );

      return {
        module: moduleWithData,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка в getStartDataForModuleOptimized для модуля ${lessonModuleId}, пользователь ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Ошибка при получении данных модуля: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private buildTaskTypeToIdsMap(
    tasks: LessonTask[],
  ): Record<string, Set<number>> {
    const taskTypeToIdsMap: Record<string, Set<number>> = {
      kana: new Set(),
      kanji: new Set(),
      word: new Set(),
      grammar: new Set(),
    };

    tasks.forEach((task) => {
      if (taskTypeToIdsMap[task.taskType]) {
        taskTypeToIdsMap[task.taskType].add(task.taskId);
      }
    });

    return taskTypeToIdsMap;
  }

  private async loadTaskDataByTypes(
    queryRunner: QueryRunner,
    taskTypeToIdsMap: Record<string, Set<number>>,
  ): Promise<Record<string, Record<number, any>>> {
    const loadedDataTaskMap: Record<string, Record<number, any>> = {
      kana: {},
      kanji: {},
      word: {},
      grammar: {},
    };

    const taskTypes = [
      { type: 'kana', entity: Kana },
      { type: 'kanji', entity: Kanji },
      { type: 'word', entity: Word },
      { type: 'grammar', entity: Grammar },
    ];

    await Promise.all(
      taskTypes.map(async ({ type, entity }) => {
        const ids = Array.from(taskTypeToIdsMap[type]);
        if (ids.length > 0) {
          const data = await queryRunner.manager
            .getRepository(entity)
            .findByIds(ids);
          data.forEach((item) => (loadedDataTaskMap[type][item.id] = item));
        }
      }),
    );

    return loadedDataTaskMap;
  }

  private attachTaskDataToTasks(
    tasks: LessonTask[],
    loadedDataTaskMap: Record<string, Record<number, any>>,
    taskTypeToIdsMap: Record<string, Set<number>>,
  ): void {
    tasks.forEach((task) => {
      const dataType = task.taskType;
      const dataId = task.taskId;

      if (loadedDataTaskMap[dataType]?.[dataId]) {
        task[dataType] = loadedDataTaskMap[dataType][dataId];
      } else if (taskTypeToIdsMap[dataType]) {
        task[dataType] = null;
        this.logger.warn(
          `Данные для задачи типа '${dataType}' с ID ${dataId} не найдены для задачи ID ${task.id}.`,
        );
      }
    });
  }

  create(createLessonDto: CreateLessonDto) {
    return 'This action adds a new lesson';
  }

  findAll() {
    return `This action returns all lesson`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lesson`;
  }

  update(id: number, updateLessonDto: UpdateLessonDto) {
    return `This action updates a #${id} lesson`;
  }

  remove(id: number) {
    return `This action removes a #${id} lesson`;
  }
}
