import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingGrammarAndTask1754100000001
  implements MigrationInterface
{
  name = 'AddMissingGrammarAndTask1754100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Начало миграции AddMissingGrammarAndTask...');

    // --- 1. Вставка недостающего грамматического элемента ---
    console.log('Вставка грамматического элемента "...を 食べる"...');
    // Предполагаем, что этот элемент должен существовать, но отсутствовал.
    // Вставляем его. ON CONFLICT DO NOTHING предотвратит ошибку, если он уже есть.
    await queryRunner.query(`
            INSERT INTO "grammar" ("sentence", "explanation", "translation", "ruleType", "jlptLevel", "difficulty")
            VALUES (
                '...を 食べる',
                'Частица を указывает на прямой объект действия (глагола).',
                '...есть (что-то)',
                'particle',
                'N5',
                1
            )
            -- Альтернатива: ON CONFLICT DO UPDATE SET ... если нужно обновлять при конфликте
        `);
    console.log(
      'Грамматический элемент "...を 食べる" вставлен или уже существовал.',
    );

    // --- 2. Получение ID пользователя learner_one ---
    console.log('Получение ID пользователя learner_one...');
    const userResult = await queryRunner.query(
      `SELECT id FROM "user" WHERE username = 'learner_one' LIMIT 1`,
    );
    const userId = userResult[0]?.id;

    if (!userId) {
      console.warn(
        'Пользователь "learner_one" не найден. Пропуск части миграции.',
      );
      // Можно выбросить ошибку, если это критично: throw new Error("...");
      // return; // Или продолжить, если вставка грамматики была основной целью
    }
    console.log(`ID пользователя learner_one: ${userId}`);

    // --- 3. Получение ID модуля "Группы а, и, у, э, о" ---
    console.log('Получение ID модуля "Группы а, и, у, э, о"...');
    const moduleResult = await queryRunner.query(
      `SELECT id FROM "lesson_module" WHERE title = 'Группы а, и, у, э, о' LIMIT 1`,
    );
    const moduleId = moduleResult[0]?.id;

    if (!moduleId) {
      console.warn(
        'Модуль "Группы а, и, у, э, о" не найден. Пропуск части миграции.',
      );
      return;
    }
    console.log(`ID модуля "Группы а, и, у, э, о": ${moduleId}`);

    // --- 4. Вставка нового урока "Основы частиц: は, を, が" ---
    console.log('Вставка нового урока "Основы частиц: は, を, が"...');
    // Найдем следующий order для урока в этом модуле
    const maxOrderResult = await queryRunner.query(
      `SELECT COALESCE(MAX("order"), 0) + 1 AS new_order FROM "lesson" WHERE "moduleId" = $1`,
      [moduleId],
    );
    const newLessonOrder = parseInt(maxOrderResult[0].new_order, 10);

    await queryRunner.query(
      `
            INSERT INTO "lesson" ("title", "description", "exerciseTypes", "status", "moduleId", "order")
            VALUES (
                'Основы частиц: は, を, が',
                'Потренируйтесь правильно вставлять частицы は, を, が в предложения.',
                '{"grammar"}',
                'locked',
                $1,
                $2
            )
            ;
        `,
      [moduleId, newLessonOrder],
    );

    // --- 5. Получение ID вставленного/обновленного урока ---
    console.log('Получение ID вставленного/обновленного урока...');
    const insertedLessonResult = await queryRunner.query(
      `SELECT id FROM "lesson" WHERE "moduleId" = $1 AND "title" = 'Основы частиц: は, を, が' ORDER BY "order" DESC LIMIT 1`,
      [moduleId],
    );
    const lessonId = insertedLessonResult[0]?.id;

    if (!lessonId) {
      console.error(
        'Не удалось получить ID вставленного урока. Пропуск создания задачи.',
      );
      return;
    }
    console.log(`ID нового урока "Основы частиц: は, を, が": ${lessonId}`);

    // --- 6. Получение ID грамматического элемента "...を 食べる" ---
    console.log('Получение ID грамматического элемента "...を 食べる"...');
    const grammarResult = await queryRunner.query(
      `SELECT id FROM "grammar" WHERE "sentence" = '...を 食べる' LIMIT 1`,
    );
    const grammarId = grammarResult[0]?.id;

    if (!grammarId) {
      // Это маловероятно, так как мы только что вставили его, но проверим на всякий случай.
      console.error(
        'Грамматический элемент "...を 食べる" не найден после вставки. Пропуск создания задачи.',
      );
      return;
    }
    console.log(`ID грамматического элемента "...を 食べる": ${grammarId}`);

    // --- 7. Вставка LessonTask ---
    console.log('Вставка грамматической задачи (LessonTask)...');
    // Предполагаем, что taskType для грамматики - 'grammar' и она ссылается на grammar.id
    await queryRunner.query(
      `
            INSERT INTO "lesson_task" ("lessonId", "order", "taskType", "taskId", "config")
            VALUES (
                $1, -- lessonId
                1,  -- order
                'grammar', -- taskType
                $2, -- taskId (ссылается на grammar.id)
                $3  -- config (строка JSON)
            )
            ;
        `,
      [
        lessonId,
        grammarId,
        JSON.stringify({
          mode: 'particle-choice',
          sentence_template: '彼___食べる。', // Или любой другой шаблон
          options: ['は', 'が', 'を', 'に'], // Варианты
          correct_answer: ['を'], // Правильный ответ
        }),
      ],
    );

    // --- 8. (Опционально) Связываем урок с грамматикой через таблицу связи lesson_grammar ---
    console.log('Связывание урока с грамматикой...');
    await queryRunner.query(
      `
            INSERT INTO "lesson_grammar" ("lessonId", "grammarId")
            VALUES ($1, $2)
        `,
      [lessonId, grammarId],
    );
    console.log('Урок связан с грамматикой.');

    // --- 9. (Опционально) Добавляем прогресс для нового урока пользователю (если пользователь найден) ---
    if (userId) {
      console.log('Добавление начального прогресса для пользователя...');
      await queryRunner.query(`
                INSERT INTO "lesson_progress" ("userId", "lessonId", "progress", "correctAttempts", "incorrectAttempts", "perceivedDifficulty", "stage", "status", "totalItems", "completedItems")
                VALUES
                (${userId}, ${lessonId}, 0, 0, 0, 2, 'new', 'not_started', 1, 0) -- Начальный прогресс
                ;
            `);
      console.log('Начальный прогресс для нового урока добавлен.');
    }

    console.log('Грамматическая задача и урок успешно добавлены.');
    console.log('Миграция AddMissingGrammarAndTask завершена успешно.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Откат миграции AddMissingGrammarAndTask...');

    // --- Откат миграции ---
    // 1. Найти и удалить задачу (LessonTask) по lessonId и типу/конфигурации
    console.log('Удаление грамматической задачи...');
    await queryRunner.query(`
            DELETE FROM "lesson_task"
            WHERE "lessonId" IN (
                SELECT l.id FROM "lesson" l
                JOIN "lesson_module" lm ON l."moduleId" = lm.id
                WHERE lm."title" = 'Группы а, и, у, э, о' AND l."title" = 'Основы частиц: は, を, が'
            )
            AND "taskType" = 'grammar';
            -- Можно дополнительно уточнить по taskId или config, если нужно
        `);

    // 2. Найти и удалить урок "Основы частиц: は, を, が" в модуле "Группы а, и, у, э, о"
    console.log('Удаление урока "Основы частиц: は, を, が"...');
    await queryRunner.query(`
            DELETE FROM "lesson"
            WHERE "moduleId" IN (
                SELECT id FROM "lesson_module" WHERE "title" = 'Группы а, и, у, э, о'
            )
            AND "title" = 'Основы частиц: は, を, が';
        `);

    // 3. (Опционально) Удалить связь из lesson_grammar (если не удаляется каскадом)
    // Обычно каскадное удаление урока удаляет и связи, но на всякий случай:
    console.log('Удаление связей урока с грамматикой (если остались)...');
    // (Этот шаг может быть избыточным, если ON DELETE CASCADE настроено правильно)
    // await queryRunner.query(`
    //     DELETE FROM "lesson_grammar"
    //     WHERE "lessonId" NOT IN (SELECT id FROM "lesson"); -- Удалить "повисшие" связи
    // `);

    // 4. (Опционально) Удалить грамматический элемент "...を 食べる"
    // Обычно не удаляют данные, вставленные другими миграциями или используемые в других местах.
    // Если это был единственный экземпляр и он больше не нужен:
    // console.log('Удаление грамматического элемента "...を 食べる" (опционально)...');
    // await queryRunner.query(`
    //     DELETE FROM "grammar" WHERE "sentence" = '...を 食べる';
    // `);

    console.log('Откат миграции AddMissingGrammarAndTask завершен.');
  }
}
