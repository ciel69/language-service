import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKanjiPacksAndInitialData1234567890123
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 6. Вставляем 20 первых кандзи (N5)
    await queryRunner.query(`
      INSERT INTO "kanji" ("char", "on", "kun", "meaning", "level") VALUES
      ('一', 'イチ,イツ', 'ひと-,ひと.つ', 'один', 'N5'),
      ('二', 'ニ,ジ', 'ふた-,ふた.つ', 'два', 'N5'),
      ('三', 'サン,ゾウ', 'み-,み.つ', 'три', 'N5'),
      ('四', 'シ', 'よん,よ.つ', 'четыре', 'N5'),
      ('五', 'ゴ', 'いつ,いつ.つ', 'пять', 'N5'),
      ('六', 'ロク', 'む-,む.つ', 'шесть', 'N5'),
      ('七', 'シチ', 'なな-,なな.つ', 'семь', 'N5'),
      ('八', 'ハチ', 'や-,や.つ', 'восемь', 'N5'),
      ('九', 'キュウ,ク', 'ここの,ここの.つ', 'девять', 'N5'),
      ('十', 'ジュウ,ジッ,ジュッ', 'とお,と', 'десять', 'N5'),
      ('日', 'ニチ,ジツ', 'ひ, -び, -か', 'день, солнце', 'N5'),
      ('月', 'ゲツ,ガツ', 'つき', 'месяц, луна', 'N5'),
      ('火', 'カ', 'ひ, -び', 'огонь', 'N5'),
      ('水', 'スイ', 'みず', 'вода', 'N5'),
      ('木', 'モク, ボク', 'き, こ-', 'дерево', 'N5'),
      ('金', 'キン, コン', 'かね, かな-', 'золото, деньги', 'N5'),
      ('土', 'ド,ト', 'つち', 'земля', 'N5'),
      ('人', 'ジン, ニン', 'ひと, -り', 'человек', 'N5'),
      ('本', 'ホン', 'もと', 'книга, основа', 'N5'),
      ('大', 'ダイ, タイ', 'おお-, おお.きい', 'большой', 'N5')
    `);

    // 7. Вставляем 3 пака
    await queryRunner.query(`
      INSERT INTO "kanji_pack" (title, level, "order", description)
      VALUES
        ('Числа 1–10', 'N5', 1, 'Базовые числительные'),
        ('Дни недели', 'N5', 2, 'Иероглифы дней недели'),
        ('Семья и основы', 'N5', 3, 'Базовые иероглифы о человеке')
    `);

    // 8. Привязываем кандзи к пакам
    await queryRunner.query(`
      UPDATE "kanji" SET "pack_id" = 1 WHERE "char" IN ('一','二','三','四','五','六','七','八','九','十');
      UPDATE "kanji" SET "pack_id" = 2 WHERE "char" IN ('日','月','火','水','木','金','土');
      UPDATE "kanji" SET "pack_id" = 3 WHERE "char" IN ('人','本','大');
    `);

    // 9. Обновляем total_count в kanji_pack_progress (пока без пользователей)
    await queryRunner.query(`
      INSERT INTO "kanji_pack" (title, level, "order", description)
      VALUES
        ('Природа', 'N5', 4, 'Иероглифы природы')
    `);

    // Добавим ещё несколько кандзи для 4-го пака
    await queryRunner.query(`
      INSERT INTO "kanji" ("char", "on", "kun", "meaning", "level") VALUES
      ('山', '{サン, セン}', '{やま}', 'гора', 'N5'),
      ('川', '{セン}', '{かわ}', 'река', 'N5'),
      ('空', '{クウ}', '{そら, あ.く, あ.ける}', 'небо, воздух', 'N5'),
      ('雨', '{ウ}', '{あめ, あま-}', 'дождь', 'N5'),
      ('風', '{フウ, フ}', '{かぜ, かざ-, -かぜ}', 'ветер', 'N5')
    `);

    await queryRunner.query(`
      UPDATE "kanji" SET "pack_id" = 4 WHERE "char" IN ('山','川','空','雨','風');
    `);

    // Обновляем описание паков с реальными количествами
    await queryRunner.query(`
      UPDATE "kanji_pack" SET description = 'Базовые числительные (1-10)' WHERE id = 1;
      UPDATE "kanji_pack" SET description = 'Дни недели и природные явления' WHERE id = 2;
      UPDATE "kanji_pack" SET description = 'Базовые иероглифы о человеке' WHERE id = 3;
      UPDATE "kanji_pack" SET description = 'Иероглифы природы' WHERE id = 4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "kanji" DROP CONSTRAINT "FK_kanji_pack"`,
    );
    await queryRunner.query(`ALTER TABLE "kanji" DROP COLUMN "pack_id"`);
    await queryRunner.query(`DROP TABLE "kanji_pack_progress"`);
    await queryRunner.query(`DROP TABLE "kanji_pack"`);
    await queryRunner.query(
      `DELETE FROM "kanji" WHERE "char" IN ('一','二','三','四','五','六','七','八','九','十','日','月','火','水','木','金','土','人','本','大','山','川','空','雨','風')`,
    );
  }
}
