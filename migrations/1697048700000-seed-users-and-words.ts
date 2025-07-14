import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedUsersAndWordsAndKanji1697048700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем пользователей
    await queryRunner.query(
      `INSERT INTO "user" ("username", "level") VALUES ('user1', 'N5'), ('user2', 'N5')`,
    );

    // Список 10 слов
    const words = [
      {
        word: '一',
        kana: 'いち',
        romaji: 'ichi',
        meaning: 'один',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '二',
        kana: 'に',
        romaji: 'ni',
        meaning: 'два',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '三',
        kana: 'さん',
        romaji: 'san',
        meaning: 'три',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '四',
        kana: 'し',
        romaji: 'shi',
        meaning: 'четыре',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '五',
        kana: 'ご',
        romaji: 'go',
        meaning: 'пять',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '六',
        kana: 'ろく',
        romaji: 'roku',
        meaning: 'шесть',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '七',
        kana: 'しち',
        romaji: 'shichi',
        meaning: 'семь',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '八',
        kana: 'はち',
        romaji: 'hachi',
        meaning: 'восемь',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '九',
        kana: 'きゅう',
        romaji: 'kyuu',
        meaning: 'девять',
        category: 'numbers',
        level: 'N5',
      },
      {
        word: '十',
        kana: 'じゅう',
        romaji: 'juu',
        meaning: 'десять',
        category: 'numbers',
        level: 'N5',
      },
    ];

    // Вставляем слова в таблицу "word"
    await queryRunner.query(
      `INSERT INTO "word" ("word", "kana", "romaji", "meaning", "category", "level") VALUES ${words
        .map(
          (word) =>
            `('${word.word}', '${word.kana}', '${word.romaji}', '${word.meaning}', '${word.category}', '${word.level}')`,
        )
        .join(', ')}`,
      [],
    );

    // Список иероглифов
    const kanjiList = [
      {
        char: '一',
        on: ['イチ'],
        kun: ['ひと', 'いち'],
        meaning: 'один',
        level: 'N5',
      },
      {
        char: '二',
        on: ['ニ'],
        kun: ['ふた', 'に'],
        meaning: 'два',
        level: 'N5',
      },
      {
        char: '三',
        on: ['サン'],
        kun: ['み', 'さぶ', 'さん'],
        meaning: 'три',
        level: 'N5',
      },
      {
        char: '四',
        on: ['シ'],
        kun: ['よん', 'し'],
        meaning: 'четыре',
        level: 'N5',
      },
      {
        char: '五',
        on: ['ゴ'],
        kun: ['ご', 'いつ', 'い', 'ごう'],
        meaning: 'пять',
        level: 'N5',
      },
      {
        char: '六',
        on: ['ロク'],
        kun: ['む', 'ろく'],
        meaning: 'шесть',
        level: 'N5',
      },
      {
        char: '七',
        on: ['ナナ'],
        kun: ['なな', 'しち'],
        meaning: 'семь',
        level: 'N5',
      },
      {
        char: '八',
        on: ['ハチ'],
        kun: ['はち', 'や', 'はつ'],
        meaning: 'восемь',
        level: 'N5',
      },
      {
        char: '九',
        on: ['キュウ'],
        kun: ['きゅう', 'こく', 'く', 'きゅう'],
        meaning: 'девять',
        level: 'N5',
      },
      {
        char: '十',
        on: ['ジュウ'],
        kun: ['と', 'じゅう'],
        meaning: 'десять',
        level: 'N5',
      },
    ];

    // Вставляем иероглифы в таблицу "kanji"
    await queryRunner.query(
      `INSERT INTO "kanji" ("char", "on", "kun", "meaning", "level") VALUES ${kanjiList
        .map(
          (kanji) =>
            `('${kanji.char}', '${JSON.stringify(kanji.on)}', '${JSON.stringify(kanji.kun)}', '${kanji.meaning}', '${kanji.level}')`,
        )
        .join(', ')}`,
      [],
    );

    // Получаем ID всех слов
    const wordsWithIds = await queryRunner.query(`SELECT id, word FROM "word"`);

    // Получаем ID всех иероглифов
    const kanjisWithIds = await queryRunner.query(
      `SELECT id, char FROM "kanji"`,
    );

    // Назначаем иероглифы словам через таблицу "word_kanji"
    for (const word of wordsWithIds) {
      const kanjiForWord = kanjisWithIds.find((k) => k.char === word.word);
      if (kanjiForWord) {
        await queryRunner.query(
          `INSERT INTO "word_kanji_kanji" ("wordId", "kanjiId") VALUES (${word.id}, ${kanjiForWord.id})`,
        );
      }
    }

    // Получаем ID пользователей
    const users = await queryRunner.query(`SELECT id FROM "user"`);

    // Добавляем прогресс по словам для каждого пользователя
    for (const user of users) {
      for (const word of wordsWithIds) {
        await queryRunner.query(
          `INSERT INTO "progress" ("userId", "wordId", "progress", "createdAt", "updatedAt")
           VALUES (${user.id}, ${word.id}, ${Math.floor(Math.random() * 100)}, NOW(), NOW())`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем данные
    await queryRunner.query(`DELETE FROM "progress"`);
    await queryRunner.query(`DELETE FROM "word_kanji_kanji"`);
    await queryRunner.query(`DELETE FROM "word"`);
    await queryRunner.query(`DELETE FROM "kanji"`);
    await queryRunner.query(`DELETE FROM "user"`);
  }
}
