import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';

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
import { LearningSection } from '@/modules/learning/entities/learning-section.entity';
import { UserService } from '@/modules/user/user.service';

export interface OptimizedModuleData {
  module: LessonModule | null;
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
    private userService: UserService, // Для использования QueryRunner если нужно
  ) {}

  async findAllWithHierarchy(page = 1, limit = 10, keycloakId?: string) {
    // Сначала получаем все данные с иерархией
    const queryBuilder = this.dataSource
      .getRepository(LearningSection)
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.modules', 'module')
      .orderBy('section.order', 'ASC')
      .addOrderBy('module.order', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [sections, total] = await queryBuilder.getManyAndCount();

    // Если передан userId, получаем прогресс по модулям
    const moduleProgressMap = new Map<number, number>();
    if (keycloakId) {
      const user = await this.userService.findByKeycloakId(keycloakId);
      const moduleIds = sections
        .flatMap((section) => section.modules)
        .map((module) => module.id);

      if (moduleIds.length > 0) {
        const progressRecords = await this.dataSource
          .createQueryBuilder()
          .select('module_progress.moduleId', 'moduleId')
          .addSelect('AVG(module_progress.progress)', 'avgProgress')
          .from('lesson_module_progress', 'module_progress')
          .where('module_progress.moduleId IN (:...moduleIds)', { moduleIds })
          .andWhere('module_progress.userId = :userId', { userId: user?.id })
          .groupBy('module_progress.moduleId')
          .getRawMany();

        progressRecords.forEach((record) => {
          moduleProgressMap.set(
            parseInt(record.moduleId),
            Math.round(parseFloat(record.avgProgress)),
          );
        });
      }
    }

    // Формируем финальную структуру данных
    const result = sections.map((section) => ({
      id: section.id,
      title: section.title,
      shortDescription: section.shortDescription,
      content: section.content,
      order: section.order,
      coverImageUrl: section.coverImageUrl,
      themeColor: section.themeColor,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      modules:
        section.modules?.map((module) => ({
          id: module.id,
          title: module.title,
          shortDescription: module.shortDescription,
          order: module.order,
          iconUrl: module.iconUrl,
          createdAt: module.createdAt,
          updatedAt: module.updatedAt,
          learningSectionId: module.learningSectionId,
          progress: moduleProgressMap.has(module.id)
            ? moduleProgressMap.get(module.id)
            : null,
        })) || [],
    }));

    return {
      data: result,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получает прогресс пользователя по конкретному модулю
   * @param userId ID пользователя
   * @param moduleId ID модуля
   * @returns Promise<number | null> прогресс в процентах или null если нет данных
   */
  async getModuleProgress(
    userId: number,
    moduleId: number,
  ): Promise<number | null> {
    const progressRecord = await this.dataSource
      .createQueryBuilder()
      .select('AVG(progress)', 'avgProgress')
      .from('lesson_module_progress', 'module_progress')
      .where('module_progress.moduleId = :moduleId', { moduleId })
      .andWhere('module_progress.userId = :userId', { userId })
      .getRawOne();

    if (progressRecord?.avgProgress) {
      return Math.round(parseFloat(progressRecord.avgProgress));
    }

    return null;
  }

  /**
   * Получает прогресс пользователя по нескольким модулям
   * @param userId ID пользователя
   * @param moduleIds массив ID модулей
   * @returns Promise<Map<number, number>> карта moduleId -> progress
   */
  async getModulesProgress(
    userId: number,
    moduleIds: number[],
  ): Promise<Map<number, number>> {
    const progressMap = new Map<number, number>();

    if (moduleIds.length === 0) {
      return progressMap;
    }

    const progressRecords = await this.dataSource
      .createQueryBuilder()
      .select('module_progress.moduleId', 'moduleId')
      .addSelect('AVG(module_progress.progress)', 'avgProgress')
      .from('lesson_module_progress', 'module_progress')
      .where('module_progress.moduleId IN (:...moduleIds)', { moduleIds })
      .andWhere('module_progress.userId = :userId', { userId })
      .groupBy('module_progress.moduleId')
      .getRawMany();

    progressRecords.forEach((record) => {
      progressMap.set(
        parseInt(record.moduleId),
        Math.round(parseFloat(record.avgProgress)),
      );
    });

    return progressMap;
  }

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
    keycloakId?: string,
  ): Promise<OptimizedModuleData> {
    if (!keycloakId) {
      return {
        module: null,
      };
    }
    const user = await this.userService.findByKeycloakId(keycloakId);
    if (!user) {
      return {
        module: null,
      };
    }
    this.logger.log(
      `Оптимизированный запрос данных для начала урока в модуле ID ${lessonModuleId} для пользователя ID ${user?.id}`,
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
          { userId: user?.id },
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
          `Модуль ID ${lessonModuleId} не имеет подходящих урокаов (без задач или с прогрессом 100%) для пользователя ID ${user.id}.`,
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
        `Ошибка в getStartDataForModuleOptimized для модуля ${lessonModuleId}, пользователь ${user.id}: ${error.message}`,
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
