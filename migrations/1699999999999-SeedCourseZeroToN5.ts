import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCourseZeroToN51699999999999 implements MigrationInterface {
  name = 'SeedCourseZeroToN51699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * 1. СЕКЦИИ
     */
    await queryRunner.query(`
      INSERT INTO public.learning_section (title, "shortDescription", content, "order", "createdAt", "updatedAt")
      VALUES
        ('Intro — Orientation', 'Введение и советы по изучению японского языка', 'Этот раздел познакомит вас с курсом и принципами обучения.', 0, now(), now()),
        ('Zero — Основы языка', 'Базовые слова, приветствия, числа, простые фразы.', 'Этот раздел научит вас понимать и использовать самые первые слова и выражения.', 1, now(), now()),
        ('N5 — Грамматика и базовый словарь', 'Грамматические конструкции JLPT N5, базовые глаголы и частицы.', 'Здесь вы изучите основы грамматики и наиболее частые слова уровня N5.', 2, now(), now())
      ON CONFLICT DO NOTHING;
    `);

    /**
     * 2. МОДУЛИ
     */
    await queryRunner.query(`
      -- Intro
      INSERT INTO public.lesson_module (title, "shortDescription", "order", "iconUrl", "createdAt", "updatedAt", "learningSectionId")
      SELECT m.title, m."shortDescription", m."order", NULL, now(), now(),
             (SELECT id FROM public.learning_section WHERE title = 'Intro — Orientation')
      FROM (VALUES
        ('Добро пожаловать', 'Обзор курса и советы', 0),
        ('Как заниматься эффективно', 'Рекомендации по учебному процессу', 1)
      ) AS m(title, "shortDescription", "order")
      ON CONFLICT DO NOTHING;

      -- Zero
      INSERT INTO public.lesson_module (title, "shortDescription", "order", "iconUrl", "createdAt", "updatedAt", "learningSectionId")
      SELECT m.title, m."shortDescription", m."order", NULL, now(), now(),
             (SELECT id FROM public.learning_section WHERE title = 'Zero — Основы языка')
      FROM (VALUES
        ('Приветствия', 'Базовые японские приветствия и прощания', 0),
        ('Числа', 'Счёт от 1 до 20, важные числительные', 1),
        ('Базовые фразы', 'Полезные выражения для начала общения', 2)
      ) AS m(title, "shortDescription", "order")
      ON CONFLICT DO NOTHING;

      -- N5
      INSERT INTO public.lesson_module (title, "shortDescription", "order", "iconUrl", "createdAt", "updatedAt", "learningSectionId")
      SELECT m.title, m."shortDescription", m."order", NULL, now(), now(),
             (SELECT id FROM public.learning_section WHERE title = 'N5 — Грамматика и базовый словарь')
      FROM (VALUES
        ('Глаголы и формы', 'ます-форма, отрицание и прошедшее время', 0),
        ('Частицы', 'Основные частицы: は, が, を, に, で', 1),
        ('Предложения', 'Простые конструкции: AはBです, вопросы', 2)
      ) AS m(title, "shortDescription", "order")
      ON CONFLICT DO NOTHING;
    `);

    /**
     * 3. УРОКИ
     */
    await queryRunner.query(`
      -- Zero: Приветствия
      INSERT INTO public.lesson (title, description, "exerciseTypes", "order", status, "moduleId")
      SELECT l.title, l.description, l."exerciseTypes", l."order", 'unlocked',
             (SELECT id FROM public.lesson_module WHERE title = 'Приветствия')
      FROM (VALUES
        ('Приветствия — часть 1', 'おはよう, こんにちは, こんばんは', '["word-meaning","word-audio","flashcard"]', 0),
        ('Прощания', 'さようなら, またね, おやすみなさい', '["word-meaning","word-audio","flashcard"]', 1)
      ) AS l(title, description, "exerciseTypes", "order")
      ON CONFLICT DO NOTHING;

      -- Zero: Числа
      INSERT INTO public.lesson (title, description, "exerciseTypes", "order", status, "moduleId")
      SELECT l.title, l.description, l."exerciseTypes", l."order", 'locked',
             (SELECT id FROM public.lesson_module WHERE title = 'Числа')
      FROM (VALUES
        ('Числа 1–10', '一, 二, 三, 四, 五, 六, 七, 八, 九, 十', '["word-meaning","flashcard","pairing"]', 0),
        ('Числа 11–20', '十一, 十二, 十三 … 二十', '["word-meaning","flashcard","pairing"]', 1)
      ) AS l(title, description, "exerciseTypes", "order")
      ON CONFLICT DO NOTHING;

      -- N5: Частицы
      INSERT INTO public.lesson (title, description, "exerciseTypes", "order", status, "moduleId")
      SELECT l.title, l.description, l."exerciseTypes", l."order", 'locked',
             (SELECT id FROM public.lesson_module WHERE title = 'Частицы')
      FROM (VALUES
        ('Частица は', 'Тема предложения', '["particle-choice","fill-in-the-blank","flashcard"]', 0),
        ('Частица を', 'Прямое дополнение', '["particle-choice","sentence-building","flashcard"]', 1)
      ) AS l(title, description, "exerciseTypes", "order")
      ON CONFLICT DO NOTHING;
    `);

    /**
     * 4. ТЕОРИЯ
     */
    await queryRunner.query(`
      -- Теория по приветствиям
      INSERT INTO public.lesson_theory_page (title, content, "order", "lessonId", "createdAt", "updatedAt")
      SELECT 'Приветствия в японском', 'В японском языке существует несколько уровней вежливости. おはよう используется утром, こんにちは — днём, こんばんは — вечером. Формальные варианты добавляют ございます.', 0,
             (SELECT id FROM public.lesson WHERE title = 'Приветствия — часть 1'), now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.lesson_theory_page WHERE title = 'Приветствия в японском');

      -- Теория по числам
      INSERT INTO public.lesson_theory_page (title, content, "order", "lessonId", "createdAt", "updatedAt")
      SELECT 'Числа в японском', 'Числа в японском языке основаны на китайской системе. Обратите внимание: 4 может читаться как よん или し, 7 — なな или しち.', 0,
             (SELECT id FROM public.lesson WHERE title = 'Числа 1–10'), now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.lesson_theory_page WHERE title = 'Числа в японском');

      -- Теория по частицам
      INSERT INTO public.lesson_theory_page (title, content, "order", "lessonId", "createdAt", "updatedAt")
      SELECT 'Частица は', 'Частица は (wa) указывает тему предложения. Важно: произносится как wa, хотя пишется как は.', 0,
             (SELECT id FROM public.lesson WHERE title = 'Частица は'), now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.lesson_theory_page WHERE title = 'Частица は');
    `);

    /**
     * 5. ЗАДАЧИ
     * Реалистичные примеры
     */
    await queryRunner.query(`
      -- Приветствия — часть 1
      INSERT INTO public.lesson_task ("lessonId","order","taskType","taskId","options","correctAnswer","config")
      SELECT l.id, gs,
             CASE WHEN gs % 3 = 0 THEN 'word-meaning'::lesson_task_tasktype_enum
                  WHEN gs % 3 = 1 THEN 'word-audio'::lesson_task_tasktype_enum
                  ELSE 'flashcard'::lesson_task_tasktype_enum END,
             0,
             '["おはよう","こんにちは","こんばんは"]',
             '["おはよう"]',
             '{"hint":"Выберите правильный перевод"}'
      FROM generate_series(1,12) gs
      CROSS JOIN LATERAL (SELECT id FROM public.lesson WHERE title = 'Приветствия — часть 1' LIMIT 1) l
      WHERE l.id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.lesson_task t WHERE t."lessonId" = l.id);
    `);

    await queryRunner.query(`
      -- Числа 1–10
      INSERT INTO public.lesson_task ("lessonId","order","taskType","taskId","options","correctAnswer","config")
      SELECT l.id, gs,
             CASE WHEN gs % 2 = 0 THEN 'word-meaning'::lesson_task_tasktype_enum
                  ELSE 'pairing'::lesson_task_tasktype_enum END,
             0,
             '["一","二","三","四","五","六","七","八","九","十"]',
             '["一=1","二=2"]',
             '{"hint":"Соотнесите цифру и её значение"}'
      FROM generate_series(1,15) gs
      CROSS JOIN LATERAL (SELECT id FROM public.lesson WHERE title = 'Числа 1–10' LIMIT 1) l
      WHERE l.id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.lesson_task t WHERE t."lessonId" = l.id);
    `);

    await queryRunner.query(`
      -- Частица は
      INSERT INTO public.lesson_task ("lessonId","order","taskType","taskId","options","correctAnswer","config")
      SELECT l.id, gs,
             CASE WHEN gs % 2 = 0 THEN 'particle-choice'::lesson_task_tasktype_enum
                  ELSE 'fill-in-the-blank'::lesson_task_tasktype_enum END,
             0,
             '["は","が","を"]',
             '["は"]',
             '{"sentence":"私は学生です。","hint":"Выберите правильную частицу"}'
      FROM generate_series(1,10) gs
      CROSS JOIN LATERAL (SELECT id FROM public.lesson WHERE title = 'Частица は' LIMIT 1) l
      WHERE l.id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.lesson_task t WHERE t."lessonId" = l.id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public.lesson_task WHERE "lessonId" IN (SELECT id FROM public.lesson WHERE title IN ('Приветствия — часть 1','Числа 1–10','Частица は'));`,
    );
    await queryRunner.query(
      `DELETE FROM public.lesson_theory_page WHERE "lessonId" IN (SELECT id FROM public.lesson WHERE title IN ('Приветствия — часть 1','Числа 1–10','Частица は'));`,
    );
    await queryRunner.query(
      `DELETE FROM public.lesson WHERE title IN ('Приветствия — часть 1','Прощания','Числа 1–10','Числа 11–20','Частица は','Частица を');`,
    );
    await queryRunner.query(
      `DELETE FROM public.lesson_module WHERE title IN ('Добро пожаловать','Как заниматься эффективно','Приветствия','Числа','Базовые фразы','Глаголы и формы','Частицы','Предложения');`,
    );
    await queryRunner.query(
      `DELETE FROM public.learning_section WHERE title IN ('Intro — Orientation','Zero — Основы языка','N5 — Грамматика и базовый словарь');`,
    );
  }
}
