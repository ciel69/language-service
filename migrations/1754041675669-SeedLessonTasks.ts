import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLessonTasks1754041675669 implements MigrationInterface {
  name = 'SeedLessonTasks1754041675669';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Начало миграции SeedLessonTasks...');

    // --- 1. Получение всех уроков ---
    console.log('Получение всех уроков...');
    // Предполагаем, что у нас есть только уроки из предыдущей миграции.
    // Получаем их, упорядочив по moduleId и order для последовательной обработки.
    const lessonsResult = await queryRunner.query(`
            SELECT id, title, "moduleId", "order"
            FROM "lesson"
            ORDER BY "moduleId", "order"
        `);
    console.log(`Найдено ${lessonsResult.length} уроков.`);

    if (lessonsResult.length === 0) {
      console.log('Уроки не найдены. Нечего заполнять задачами.');
      return;
    }

    // --- 2. Предположения об ID учебных элементов ---
    // Для простоты этого сида предположим следующие ID.
    // В реальном приложении эти ID должны совпадать с ID, вставленными или существующими в таблицах kana, kanji, word, grammar.
    // Примерный диапазон:
    // Kana (ID 1-35): あ=1, い=2, う=3, え=4, お=5, か=6, き=7, く=8, け=9, こ=10, ...
    // Word (ID 1-50): связано с kana (пустой кандзи) или kanji. Пример: 'あい'=1, 'あか'=2, ..., '一人'=11, '二日'=12, ...
    // Kanji (ID 1-20): 一=1, 二=2, 人=3, 日=4, 月=5, 火=6, 水=7, 木=8, 金=9, 土=10, ...
    // Grammar (ID 1-10): これは 本 です。=1, あの 人 は 学生 です。=2, ...を 食べる=3, ...

    // --- 3. Добавление LessonTasks ---
    console.log('Начало вставки задач (LessonTask)...');

    for (const lesson of lessonsResult) {
      const lessonId = lesson.id;
      const lessonTitle = lesson.title;
      const lessonModuleId = lesson.moduleId;
      const lessonOrder = lesson.order;

      console.log(
        `  Обработка урока ID ${lessonId}: "${lessonTitle}" (Module: ${lessonModuleId}, Order: ${lessonOrder})`,
      );

      // --- Логика генерации задач для каждого типа урока ---
      // Это упрощенный пример. В реальном приложении логика будет сложнее и, возможно, будет
      // использовать данные из других таблиц или внешние источники для генерации вариантов.

      let tasksToInsert: {
        order: number;
        taskType: string;
        taskId: number;
        config: object;
      }[] = [];

      if (lessonTitle.includes('Распознавание')) {
        // --- Задачи типа 'kana' ---
        // Предположим, что taskId соответствует ID символа 'а', 'и', 'у' и т.д. в зависимости от урока.
        // Это очень упрощенная логика. В реальности нужно сопоставлять название урока с конкретными символами.
        const baseTaskId = this.getBaseTaskIdForRecognitionLesson(
          lessonModuleId,
          lessonOrder,
        );
        if (baseTaskId) {
          tasksToInsert = [
            {
              order: 1,
              taskType: 'kana',
              taskId: baseTaskId,
              config: { mode: 'show_symbol', options_count: 4 },
            },
            {
              order: 2,
              taskType: 'kana',
              taskId: baseTaskId + 1,
              config: { mode: 'show_symbol', options_count: 4 },
            },
            {
              order: 3,
              taskType: 'kana',
              taskId: baseTaskId + 2,
              config: { mode: 'show_symbol', options_count: 4 },
            },
            // Добавить больше задач по необходимости
          ];
        }
      } else if (lessonTitle.includes('Письмо')) {
        // --- Задачи типа 'kana' ---
        const baseTaskId = this.getBaseTaskIdForWritingLesson(
          lessonModuleId,
          lessonOrder,
        );
        if (baseTaskId) {
          tasksToInsert = [
            {
              order: 1,
              taskType: 'kana',
              taskId: baseTaskId,
              config: { mode: 'stroke' },
            },
            {
              order: 2,
              taskType: 'kana',
              taskId: baseTaskId + 1,
              config: { mode: 'stroke' },
            },
            {
              order: 3,
              taskType: 'kana',
              taskId: baseTaskId + 2,
              config: { mode: 'stroke' },
            },
          ];
        }
      } else if (lessonTitle.includes('Аудирование')) {
        // --- Задачи типа 'kana' ---
        const baseTaskId = this.getBaseTaskIdForAudioLesson(
          lessonModuleId,
          lessonOrder,
        );
        if (baseTaskId) {
          tasksToInsert = [
            {
              order: 1,
              taskType: 'kana',
              taskId: baseTaskId,
              config: { mode: 'audio', options_count: 4 },
            },
            {
              order: 2,
              taskType: 'kana',
              taskId: baseTaskId + 1,
              config: { mode: 'audio', options_count: 4 },
            },
            {
              order: 3,
              taskType: 'kana',
              taskId: baseTaskId + 2,
              config: { mode: 'audio', options_count: 4 },
            },
          ];
        }
      } else if (
        lessonTitle.includes('Слова') &&
        lessonTitle.includes('а, и, у')
      ) {
        // --- Задачи типа 'word' для слов с а, и, у ---
        // Предполагаем, что слова 'あい'(1), 'あか'(2), 'あさ'(3) уже существуют.
        tasksToInsert = [
          {
            order: 1,
            taskType: 'word',
            taskId: 1,
            config: { mode: 'show_word', question: 'Какой ромадзи?' },
          },
          {
            order: 2,
            taskType: 'word',
            taskId: 2,
            config: { mode: 'show_word', question: 'Какой ромадзи?' },
          },
          {
            order: 3,
            taskType: 'word',
            taskId: 3,
            config: { mode: 'show_word', question: 'Какой ромадзи?' },
          },
        ];
      } else if (
        lessonTitle.includes('Изучение') &&
        lessonTitle.includes('一, 二')
      ) {
        // --- Задачи для изучения кандзи 一, 二 ---
        tasksToInsert = [
          {
            order: 1,
            taskType: 'kanji',
            taskId: 1,
            config: { mode: 'flashcard', show: 'char' },
          },
          {
            order: 2,
            taskType: 'kanji',
            taskId: 2,
            config: { mode: 'flashcard', show: 'char' },
          },
        ];
      } else if (
        lessonTitle.includes('Чтение') &&
        lessonTitle.includes('一, 二')
      ) {
        // --- Задачи для чтения кандзи 一, 二 ---
        tasksToInsert = [
          {
            order: 1,
            taskType: 'kanji',
            taskId: 1,
            config: { mode: 'show_char', question: 'Какое он-чтение?' },
          },
          {
            order: 2,
            taskType: 'kanji',
            taskId: 2,
            config: { mode: 'show_char', question: 'Какое он-чтение?' },
          },
        ];
      } else if (
        lessonTitle.includes('Слова') &&
        lessonTitle.includes('一, 二')
      ) {
        // --- Задачи для слов с 一, 二 ---
        // Предполагаем, что слова '一人'(11), '二日'(12) уже существуют.
        tasksToInsert = [
          {
            order: 1,
            taskType: 'word',
            taskId: 11,
            config: { mode: 'show_word', question: 'Какой кандзи?' },
          },
          {
            order: 2,
            taskType: 'word',
            taskId: 12,
            config: { mode: 'show_word', question: 'Какой кандзи?' },
          },
        ];
      } else if (
        lessonTitle.includes('Письмо') &&
        lessonTitle.includes('一, 二')
      ) {
        // --- Задачи для письма кандзи 一, 二 ---
        tasksToInsert = [
          {
            order: 1,
            taskType: 'kanji',
            taskId: 1,
            config: { mode: 'stroke' },
          },
          {
            order: 2,
            taskType: 'kanji',
            taskId: 2,
            config: { mode: 'stroke' },
          },
        ];
      } else {
        // --- Урок по умолчанию или не подпадающий под категории ---
        // Добавим универсальную задачу или оставим пустым.
        // Например, смешанный обзор.
        console.log(
          `    Нет специфической логики для урока "${lessonTitle}". Пропуск.`,
        );
        continue; // Пропускаем вставку для этого урока
        // tasksToInsert = [
        //     { order: 1, taskType: 'kana', taskId: 1, config: { mode: 'show_symbol', options_count: 4 } },
        // ];
      }

      // --- 4. Вставка сгенерированных задач ---
      if (tasksToInsert.length > 0) {
        console.log(`    Вставка ${tasksToInsert.length} задач...`);
        const values = tasksToInsert
          .map(
            (task, index) =>
              `(${lessonId}, ${task.order}, '${task.taskType}', ${task.taskId}, '${JSON.stringify(task.config)}'::jsonb)`,
          )
          .join(', ');

        try {
          await queryRunner.query(`
                        INSERT INTO "lesson_task" ("lessonId", "order", "taskType", "taskId", "config")
                        VALUES ${values}
                        ON CONFLICT DO NOTHING;
                    `);
          console.log(
            `    Успешно вставлено ${tasksToInsert.length} задач для урока ID ${lessonId}.`,
          );
        } catch (err) {
          console.error(
            `    Ошибка при вставке задач для урока ID ${lessonId}:`,
            err,
          );
          // Можно выбросить ошибку, чтобы откатить всю миграцию, или продолжить
          // throw err;
        }
      } else {
        console.log(`    Нет задач для вставки в урок ID ${lessonId}.`);
      }
    }

    console.log('Миграция SeedLessonTasks завершена успешно.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Откат миграции SeedLessonTasks...');
    // --- Откат миграции ---
    // Удаляем все задачи уроков. Это разрушительно, но соответствует цели миграции.
    await queryRunner.query(`DELETE FROM "lesson_task";`);
    console.log('Все задачи уроков (LessonTask) удалены.');
    console.log('Откат миграции SeedLessonTasks завершен.');
  }

  // --- Вспомогательные методы для определения taskId ---
  // Эти методы упрощают логику сида, связывая уроки с конкретными учебными элементами.
  // В реальном приложении эта логика может быть гораздо сложнее и основываться на данных из БД.

  private getBaseTaskIdForRecognitionLesson(
    moduleId: number,
    lessonOrder: number,
  ): number | null {
    // Логика должна быть основана на moduleId и lessonOrder
    // Например:
    // Module 1 (Группы а, и, у, э, о) -> Kana ID 1-5
    // Module 2 (Группы ка, са, та, на) -> Kana ID 6-10
    // и т.д.
    if (moduleId === 1 && lessonOrder === 1) return 1; // あ, い, う
    if (moduleId === 2 && lessonOrder === 1) return 6; // か, き, く
    if (moduleId === 3 && lessonOrder === 1) return 16; // は, ひ, ふ
    // ... другие модули
    return null; // Не найдено соответствие
  }

  private getBaseTaskIdForWritingLesson(
    moduleId: number,
    lessonOrder: number,
  ): number | null {
    // Аналогично getBaseTaskIdForRecognitionLesson
    if (moduleId === 1 && lessonOrder === 2) return 1; // あ, い, う
    if (moduleId === 2 && lessonOrder === 2) return 6; // か, き, く
    if (moduleId === 3 && lessonOrder === 2) return 16; // は, ひ, ふ
    return null;
  }

  private getBaseTaskIdForAudioLesson(
    moduleId: number,
    lessonOrder: number,
  ): number | null {
    // Аналогично getBaseTaskIdForRecognitionLesson
    if (moduleId === 1 && lessonOrder === 3) return 1; // あ, い, う
    if (moduleId === 2 && lessonOrder === 3) return 6; // か, き, く
    if (moduleId === 3 && lessonOrder === 3) return 16; // は, ひ, ふ
    return null;
  }
}
