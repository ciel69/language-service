import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAchievements1728999999999 implements MigrationInterface {
  name = 'SeedAchievements1728999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const achievements = [
      // 👇 НОВАЯ АЧИВКА — ПРОСТАЯ И КЛЮЧЕВАЯ!
      {
        title: 'Первый урок',
        description: 'Вы прошли первый урок — поздравляем!',
        icon: 'rocket-launch', // Heroicons outline: https://heroicons.com/
        category: 'learning',
        points: 25,
        condition: { type: 'lesson_completed', value: 1 },
        is_hidden: false, // 👈 ВИДИМО — чтобы сразу было видно при тестировании
      },

      {
        title: 'Первый шаг',
        description: 'Выучите первое слово!',
        icon: 'book-open',
        category: 'learning',
        points: 10,
        condition: { type: 'first_word', value: 1 },
        is_hidden: true,
      },
      {
        title: 'Словарный запас',
        description: 'Выучите 10 слов!',
        icon: 'document-text',
        category: 'learning',
        points: 50,
        condition: { type: 'words_learned', value: 10 },
        is_hidden: false,
      },
      {
        title: 'Мастер слов',
        description: 'Выучите 50 слов!',
        icon: 'star',
        category: 'learning',
        points: 150,
        condition: { type: 'words_learned', value: 50 },
        is_hidden: false,
      },
      {
        title: 'Пять уроков подряд',
        description: 'Пройдите 5 уроков за один день!',
        icon: 'clipboard-check',
        category: 'streak',
        points: 75,
        condition: { type: 'lesson_completed', value: 5 },
        is_hidden: false,
      },
      {
        title: 'Недельная стойкость',
        description: 'Зайдите в приложение 7 дней подряд!',
        icon: 'clock',
        category: 'streak',
        points: 200,
        condition: { type: 'streak_days', value: 7 },
        is_hidden: false,
      },
      {
        title: 'Кана-мастер',
        description: 'Освойте все 46 кана уровня N5!',
        icon: 'alphabet',
        category: 'expert',
        points: 300,
        condition: { type: 'kana_mastered', value: 46 },
        is_hidden: false,
      },
      {
        title: 'День активности',
        description: 'Наберите 100 очков за день!',
        icon: 'fire',
        category: 'bonus',
        points: 100,
        condition: { type: 'daily_points', value: 100 },
        is_hidden: false,
      },
      {
        title: 'Грамматический гений',
        description: 'Изучите 10 грамматических правил!',
        icon: 'adjustments-horizontal',
        category: 'expert',
        points: 250,
        condition: { type: 'grammar_mastered', value: 10 },
        is_hidden: false,
      },
    ];

    // Проверим, какие достижения уже есть
    const existingTitles = await queryRunner.query(
      `
        SELECT "title" FROM "achievement" WHERE "title" IN ($1)
      `,
      [achievements.map((a) => a.title)],
    );

    const titlesToInsert = achievements.filter(
      (ach) => !existingTitles.some((e) => e.title === ach.title),
    );

    if (titlesToInsert.length === 0) {
      console.log('ℹ️ Все достижения уже существуют. Пропускаем вставку.');
      return;
    }

    // Вставка с использованием Heroicons иконок
    await queryRunner.query(
      `
        INSERT INTO "achievement" (
          "title", "description", "icon", "category", "points", "condition", "is_hidden", "created_at", "updated_at"
        ) VALUES
          ${titlesToInsert
            .map((ach) => {
              return `(
                '${this.escapeString(ach.title)}',
                '${this.escapeString(ach.description)}',
                '${ach.icon}',
                '${ach.category}',
                ${ach.points},
                '${JSON.stringify(ach.condition).replace(/'/g, "''")}',
                ${ach.is_hidden ? 'true' : 'false'},
                NOW(),
                NOW()
              )`;
            })
            .join(',\n')}`,
    );

    console.log(`✅ Вставлено ${titlesToInsert.length} новых достижений.`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "achievement" WHERE "title" IN (
                                                                         'Первый урок',
                                                                         'Первый шаг',
                                                                         'Словарный запас',
                                                                         'Мастер слов',
                                                                         'Пять уроков подряд',
                                                                         'Недельная стойкость',
                                                                         'Кана-мастер',
                                                                         'День активности',
                                                                         'Грамматический гений'
      );`);

    console.log('❌ Удалены seed-достижения.');
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }
}
