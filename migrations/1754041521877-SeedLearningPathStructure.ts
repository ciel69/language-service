import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLearningPathStructure1754041521877
  implements MigrationInterface
{
  name = 'SeedLearningPathStructure1754041521877';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Начало миграции SeedLearningPathStructure...');

    // --- 1. Добавление пользователей ---
    console.log('Вставка пользователей...');
    await queryRunner.query(`
            INSERT INTO "user" ("username", "level")
            VALUES
                ('learner_one', 'N5'),
                ('learner_two', 'N4')
            ON CONFLICT ("username") DO NOTHING;
        `);
    const usersResult = await queryRunner.query(
      `SELECT id, username FROM "user" WHERE username IN ('learner_one', 'learner_two') ORDER BY id`,
    );
    const userId1 = usersResult.find(
      (u: any) => u.username === 'learner_one',
    )?.id;
    const userId2 = usersResult.find(
      (u: any) => u.username === 'learner_two',
    )?.id;
    console.log(`Пользователи вставлены/получены. ID: ${userId1}, ${userId2}`);

    // --- 2. Добавление Learning Sections ---
    console.log('Вставка разделов обучения (LearningSection)...');
    await queryRunner.query(`
            INSERT INTO "learning_section" ("title", "shortDescription", "content", "order", "coverImageUrl", "themeColor")
            VALUES
            ('Основы Хираганы', 'Изучите базовые символы японской слоговой азбуки.', '<h2>Добро пожаловать в мир Хираганы!</h2><p>Хирагана - это основная слоговая азбука японского языка...</p>', 1, '/images/sections/hiragana.jpg', '#8B5CF6'),
            ('Введение в Кандзи JLPT N5', 'Первые шаги в изучении иероглифов уровня N5.', '<h2>Что такое Кандзи?</h2><p>Кандзи - это китайские иероглифы, используемые в японском письме...</p>', 2, '/images/sections/kanji_n5.jpg', '#10B981')
            ON CONFLICT DO NOTHING;
        `);
    const sectionsResult = await queryRunner.query(
      `SELECT id, title FROM "learning_section" WHERE title IN ('Основы Хираганы', 'Введение в Кандзи JLPT N5') ORDER BY "order"`,
    );
    const section1Id = sectionsResult[0]?.id;
    const section2Id = sectionsResult[1]?.id;
    console.log(`Разделы вставлены. ID: ${section1Id}, ${section2Id}`);

    // --- 3. Добавление Lesson Modules ---
    console.log('Вставка модулей уроков (LessonModule)...');
    if (section1Id && section2Id) {
      await queryRunner.query(`
                INSERT INTO "lesson_module" ("title", "shortDescription", "order", "iconUrl", "learningSectionId")
                VALUES
                -- Модули для "Основы Хираганы"
                ('Группы а, и, у, э, о', 'Изучение первых 5 символов хираганы.', 1, '/images/modules/h_a.png', ${section1Id}),
                ('Группы ка, са, та, на', 'Продолжаем освоение хираганы.', 2, '/images/modules/h_ks.png', ${section1Id}),
                ('Группы ха, ма, я', 'Завершение базовой хираганы.', 3, '/images/modules/h_hm.png', ${section1Id}),

                -- Модули для "Введение в Кандзи JLPT N5"
                ('Кандзи 1-10', 'Первые 10 иероглифов JLPT N5.', 1, '/images/modules/k_1.png', ${section2Id}),
                ('Кандзи 11-20', 'Следующие 10 иероглифов JLPT N5.', 2, '/images/modules/k_2.png', ${section2Id})
                ON CONFLICT DO NOTHING;
            `);
    }
    const modulesResult = await queryRunner.query(`
            SELECT id, title, "learningSectionId" FROM "lesson_module"
            WHERE "learningSectionId" IN (${section1Id}, ${section2Id})
            ORDER BY "learningSectionId", "order"
        `);
    const section1Modules = modulesResult.filter(
      (m: any) => m.learningSectionId === section1Id,
    );
    const section2Modules = modulesResult.filter(
      (m: any) => m.learningSectionId === section2Id,
    );
    console.log(`Модули вставлены.`);
    console.log(
      `  Раздел 1 (${section1Id}):`,
      section1Modules.map((m: any) => m.title),
    );
    console.log(
      `  Раздел 2 (${section2Id}):`,
      section2Modules.map((m: any) => m.title),
    );

    // --- 4. Добавление Lessons ---
    console.log('Вставка уроков (Lesson)...');
    // ID модулей
    const module1Id = section1Modules[0]?.id;
    const module2Id = section1Modules[1]?.id;
    const module3Id = section1Modules[2]?.id;
    const module4Id = section2Modules[0]?.id;
    const module5Id = section2Modules[1]?.id;

    if (module1Id && module2Id && module3Id && module4Id && module5Id) {
      // --- Уроки для "Группы а, и, у, э, о" (module 1) ---
      await queryRunner.query(`
                INSERT INTO "lesson" ("title", "description", "exerciseTypes", "status", "moduleId", "order")
                VALUES
                ('Распознавание а, и, у', 'Научитесь различать символы あ, い, う.', '{"kana-recognition"}', 'locked', ${module1Id}, 1),
                ('Письмо а, и, у', 'Потренируйтесь писать символы あ, い, う.', '{"kana-writing"}', 'locked', ${module1Id}, 2),
                ('Аудирование а, и, у', 'Послушайте и определите символы あ, い, う.', '{"kana-audio"}', 'locked', ${module1Id}, 3),
                ('Слова с а, и, у', 'Изучите простые слова, содержащие あ, い, う.', '{"word-meaning"}', 'locked', ${module1Id}, 4),
                ('Повторение группы а, и, у', 'Проверьте свои знания группы а, и, у.', '{"kana-recognition", "kana-writing"}', 'locked', ${module1Id}, 5)
                ON CONFLICT DO NOTHING;
            `);

      // --- Уроки для "Группы ка, са, та, на" (module 2) ---
      await queryRunner.query(`
                INSERT INTO "lesson" ("title", "description", "exerciseTypes", "status", "moduleId", "order")
                VALUES
                ('Распознавание ка, са, та, на', 'Изучите символы か, さ, た, な.', '{"kana-recognition"}', 'locked', ${module2Id}, 1),
                ('Письмо ка, са, та, на', 'Потренируйтесь писать символы か, さ, た, な.', '{"kana-writing"}', 'locked', ${module2Id}, 2),
                ('Аудирование ка, са, та, на', 'Послушайте и определите символы か, さ, た, な.', '{"kana-audio"}', 'locked', ${module2Id}, 3),
                ('Слова с ка, са, та, на', 'Изучите слова, содержащие か, さ, た, な.', '{"word-meaning"}', 'locked', ${module2Id}, 4)
                ON CONFLICT DO NOTHING;
            `);

      // --- Уроки для "Группы ха, ма, я" (module 3) ---
      await queryRunner.query(`
                INSERT INTO "lesson" ("title", "description", "exerciseTypes", "status", "moduleId", "order")
                VALUES
                ('Распознавание ха, ма, я', 'Изучите символы は, ま, や.', '{"kana-recognition"}', 'locked', ${module3Id}, 1),
                ('Письмо ха, ма, я', 'Потренируйтесь писать символы は, ま, や.', '{"kana-writing"}', 'locked', ${module3Id}, 2),
                ('Аудирование ха, ма, я', 'Послушайте и определите символы は, ま, や.', '{"kana-audio"}', 'locked', ${module3Id}, 3),
                ('Слова с ха, ма, я', 'Изучите слова, содержащие は, ま, や.', '{"word-meaning"}', 'locked', ${module3Id}, 4),
                ('Смешанный обзор Хираганы', 'Проверьте знания всех изученных символов хираганы.', '{"kana-recognition", "word-meaning", "kana-audio"}', 'locked', ${module3Id}, 5)
                ON CONFLICT DO NOTHING;
            `);

      // --- Уроки для "Кандзи 1-10" (module 4) ---
      await queryRunner.query(`
                INSERT INTO "lesson" ("title", "description", "exerciseTypes", "status", "moduleId", "order")
                VALUES
                ('Изучение 一, 二, 三', 'Знакомство с иероглифами 一, 二, 三.', '{"kanji-meaning"}', 'locked', ${module4Id}, 1),
                ('Чтение 一, 二, 三', 'Потренируйтесь в он- и кун-чтениях 一, 二, 三.', '{"kanji-reading"}', 'locked', ${module4Id}, 2),
                ('Слова с 一, 二, 三', 'Изучите слова, содержащие 一, 二, 三.', '{"word-meaning"}', 'locked', ${module4Id}, 3),
                ('Письмо 一, 二, 三', 'Потренируйтесь писать иероглифы 一, 二, 三.', '{"kanji-writing"}', 'locked', ${module4Id}, 4),
                ('Повторение 一, 二, 三', 'Закрепите знания иероглифов 一, 二, 三.', '{"kanji-meaning", "kanji-reading"}', 'locked', ${module4Id}, 5)
                ON CONFLICT DO NOTHING;
            `);

      // --- Уроки для "Кандзи 11-20" (module 5) ---
      await queryRunner.query(`
                INSERT INTO "lesson" ("title", "description", "exerciseTypes", "status", "moduleId", "order")
                VALUES
                ('Изучение 十, 人, 日', 'Знакомство с иероглифами 十, 人, 日.', '{"kanji-meaning"}', 'locked', ${module5Id}, 1),
                ('Чтение 十, 人, 日', 'Потренируйтесь в он- и кун-чтениях 十, 人, 日.', '{"kanji-reading"}', 'locked', ${module5Id}, 2),
                ('Слова с 十, 人, 日', 'Изучите слова, содержащие 十, 人, 日.', '{"word-meaning"}', 'locked', ${module5Id}, 3),
                ('Письмо 十, 人, 日', 'Потренируйтесь писать иероглифы 十, 人, 日.', '{"kanji-writing"}', 'locked', ${module5Id}, 4)
                ON CONFLICT DO NOTHING;
            `);

      console.log('Уроки вставлены.');
    } else {
      console.warn(
        'Не удалось получить ID всех модулей, пропускаем вставку уроков.',
      );
    }

    // --- 5. Добавление LessonTasks (Примеры) ---
    console.log('Вставка задач (LessonTask)...');
    // Получаем ID уроков для добавления задач
    const lessonsResult = await queryRunner.query(`
            SELECT id, title, "moduleId" FROM "lesson"
            WHERE "moduleId" IN (${module1Id}, ${module2Id}, ${module3Id}, ${module4Id}, ${module5Id})
            ORDER BY "moduleId", "order"
        `);

    // Пример: Добавляем задачи для первого урока "Распознавание а, и, у"
    const firstLesson = lessonsResult.find(
      (l: any) => l.moduleId === module1Id && l.order === 1,
    );
    if (firstLesson) {
      await queryRunner.query(`
                INSERT INTO "lesson_task" ("lessonId", "order", "taskType", "taskId", "config")
                VALUES
                (${firstLesson.id}, 1, 'kana-recognition', 1, '{"mode": "show_symbol", "options_count": 4}'),
                (${firstLesson.id}, 2, 'kana-recognition', 2, '{"mode": "show_symbol", "options_count": 4}'),
                (${firstLesson.id}, 3, 'kana-recognition', 3, '{"mode": "show_symbol", "options_count": 4}')
                ON CONFLICT DO NOTHING;
            `);
    }

    // Пример: Добавляем задачи для первого урока "Изучение 一, 二, 三"
    const firstKanjiLesson = lessonsResult.find(
      (l: any) => l.moduleId === module4Id && l.order === 1,
    );
    if (firstKanjiLesson) {
      await queryRunner.query(`
                INSERT INTO "lesson_task" ("lessonId", "order", "taskType", "taskId", "config")
                VALUES
                (${firstKanjiLesson.id}, 1, 'kanji-meaning', 1, '{"mode": "flashcard", "show": "char"}'),
                (${firstKanjiLesson.id}, 2, 'kanji-meaning', 2, '{"mode": "flashcard", "show": "char"}'),
                (${firstKanjiLesson.id}, 3, 'kanji-meaning', 3, '{"mode": "flashcard", "show": "char"}')
                ON CONFLICT DO NOTHING;
            `);
    }

    console.log('Примеры задач вставлены.');

    // --- 6. Добавление прогресса (Пример для пользователя 1) ---
    console.log('Вставка примера прогресса пользователей...');
    if (userId1 && module1Id) {
      // Прогресс по модулям
      await queryRunner.query(`
                INSERT INTO "lesson_module_progress" ("userId", "moduleId", "progress", "correctAttempts", "incorrectAttempts", "perceivedDifficulty", "stage")
                VALUES
                (${userId1}, ${module1Id}, 100, 10, 0, 1, 'mastered'),
                (${userId1}, ${module2Id}, 50, 5, 5, 2, 'learning')
                ON CONFLICT ("userId", "moduleId") DO NOTHING;
            `);

      // Прогресс по урокам (пример для одного урока из завершенного модуля)
      const lesson1Id = (
        await queryRunner.query(
          `SELECT id FROM "lesson" WHERE "moduleId" = ${module1Id} ORDER BY "order" LIMIT 1`,
        )
      )[0]?.id;
      if (lesson1Id) {
        await queryRunner.query(`
                    INSERT INTO "lesson_progress" ("userId", "lessonId", "progress", "correctAttempts", "incorrectAttempts", "perceivedDifficulty", "stage", "status", "totalItems", "completedItems")
                    VALUES
                    (${userId1}, ${lesson1Id}, 100, 5, 0, 1, 'mastered', 'completed', 5, 5)
                    ON CONFLICT ("userId", "lessonId") DO NOTHING;
                `);
      }

      console.log(`Пример прогресса для пользователя ID ${userId1} добавлен.`);
    } else {
      console.warn(
        'Не удалось добавить пример прогресса: отсутствуют ID пользователя или модулей.',
      );
    }

    console.log('Миграция SeedLearningPathStructure завершена успешно.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Откат миграции SeedLearningPathStructure (частичный)...');

    // --- Откат миграции ---
    // ВНИМАНИЕ: Этот скрипт удаления является демонстрационным.
    // Он удаляет ВСЕ данные, созданные этой миграцией.
    // В реальном проекте лучше использовать флаги `is_seed` или отдельные таблицы для сида.

    // 1. Удалить тестовых пользователей (и связанные данные, если CASCADE настроено)
    await queryRunner.query(
      `DELETE FROM "user" WHERE username IN ('learner_one', 'learner_two');`,
    );
    console.log('Тестовые пользователи удалены.');

    // 2. Удаление прогресса (должно удалиться каскадом)
    // await queryRunner.query(`DELETE FROM "lesson_module_progress" WHERE "userId" IN (SELECT id FROM "user" WHERE username IN ('learner_one', 'learner_two'));`);
    // await queryRunner.query(`DELETE FROM "lesson_progress" WHERE "userId" IN (SELECT id FROM "user" WHERE username IN ('learner_one', 'learner_two'));`);
    // console.log('Прогресс пользователей удален.');

    // 3. Удаление задач уроков
    // await queryRunner.query(`DELETE FROM "lesson_task" WHERE "lessonId" IN (SELECT id FROM "lesson");`);
    // console.log('Задачи уроков удалены.');

    // 4. Удаление уроков
    // await queryRunner.query(`DELETE FROM "lesson";`);
    // console.log('Уроки удалены.');

    // 5. Удаление модулей
    // await queryRunner.query(`DELETE FROM "lesson_module";`);
    // console.log('Модули уроков удалены.');

    // 6. Удаление разделов
    // await queryRunner.query(`DELETE FROM "learning_section";`);
    // console.log('Разделы обучения удалены.');

    console.log(
      'Откат миграции SeedLearningPathStructure завершен (закомментирован для безопасности).',
    );
    console.log(
      'Для выполнения отката, раскомментируйте соответствующие строки.',
    );
  }
}
