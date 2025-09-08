import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedKanaUsersWordsAndProgress1753712345678
  implements MigrationInterface
{
  name = 'SeedKanaUsersWordsAndProgress1753712345678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Добавление пользователей ---
    console.log('Вставка пользователей...');
    await queryRunner.query(`
            INSERT INTO "user" ("username", "level")
            VALUES
                ('test_user_1', 'N5'),
                ('test_user_2', 'N4')
        `);

    const usersResult = await queryRunner.query(
      `SELECT id, username FROM "user" WHERE username IN ('test_user_1', 'test_user_2') ORDER BY id`,
    );
    console.log('usersResult', usersResult);
    const userId1 = usersResult.find(
      (u: any) => u.username === 'test_user_1',
    )?.id;
    const userId2 = usersResult.find(
      (u: any) => u.username === 'test_user_2',
    )?.id;
    console.log(`Пользователи вставлены/получены. ID: ${userId1}, ${userId2}`);

    // --- 2. Добавление всех символов хираганы и катаканы ---
    console.log('Вставка символов каны...');
    const kanaData = [
      // --- Хирагана (Hiragana) ---
      // Простые (simple)
      {
        char: 'あ',
        romaji: 'a',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['愛 (あい)', '赤 (あか)', '朝 (あさ)'],
        jlptLevel: null,
      },
      {
        char: 'い',
        romaji: 'i',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['家 (いえ)', '今 (いま)'],
      },
      {
        char: 'う',
        romaji: 'u',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['海 (うみ)', '歌 (うた)'],
      },
      {
        char: 'え',
        romaji: 'e',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['絵 (え)'],
      },
      {
        char: 'お',
        romaji: 'o',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['おはよう'],
      },
      {
        char: 'か',
        romaji: 'ka',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['学校 (がっこう)', '柿 (かき)'],
      },
      {
        char: 'き',
        romaji: 'ki',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['木 (き)', '黄色 (きいろ)'],
      },
      {
        char: 'く',
        romaji: 'ku',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['雲 (くも)', '国 (くに)'],
      },
      {
        char: 'け',
        romaji: 'ke',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['毛 (け)'],
      },
      {
        char: 'こ',
        romaji: 'ko',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['子 (こ)', '午後 (ごご)'],
      },
      {
        char: 'さ',
        romaji: 'sa',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['差 (さ)', '傘 (かさ)'],
      },
      {
        char: 'し',
        romaji: 'shi',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['詩 (し)', '塩 (しお)'],
      },
      {
        char: 'す',
        romaji: 'su',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['寿司 (すし)', '涼しい (すずしい)'],
      },
      {
        char: 'せ',
        romaji: 'se',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['背 (せ)', '世界 (せかい)'],
      },
      {
        char: 'そ',
        romaji: 'so',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['空 (そら)', '背が高い (せがたかい)'],
      },
      {
        char: 'た',
        romaji: 'ta',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['田 (た)', '立つ (たつ)'],
      },
      {
        char: 'ち',
        romaji: 'chi',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['父 (ちち)', '地図 (ちず)'],
      },
      {
        char: 'つ',
        romaji: 'tsu',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['月 (つき)', '使う (つかう)'],
      },
      {
        char: 'て',
        romaji: 'te',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['手 (て)', '出口 (でぐち)'],
      },
      {
        char: 'と',
        romaji: 'to',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['人 (と)', '戸 (と)'],
      },
      {
        char: 'な',
        romaji: 'na',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['夏 (なつ)', '名前 (なまえ)'],
      },
      {
        char: 'に',
        romaji: 'ni',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['日 (にち)', 'にほん'],
      },
      {
        char: 'ぬ',
        romaji: 'nu',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['布 (ぬの)'],
      },
      {
        char: 'ね',
        romaji: 'ne',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['値段 (ねだん)'],
      },
      {
        char: 'の',
        romaji: 'no',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['のんびり', '本 (ほん)'],
      },
      {
        char: 'は',
        romaji: 'ha',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['花 (はな)', '速い (はやい)'],
      },
      {
        char: 'ひ',
        romaji: 'hi',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['火 (ひ)', '日曜日 (にちようび)'],
      },
      {
        char: 'ふ',
        romaji: 'fu',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['風 (ふう)', '二分 (ふたぶ)'],
      },
      {
        char: 'へ',
        romaji: 'he',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['辺 (へ)', '下へ (したへ)'],
      },
      {
        char: 'ほ',
        romaji: 'ho',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['星 (ほし)', '本 (ほん)'],
      },
      {
        char: 'ま',
        romaji: 'ma',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['間 (ま)', '真っ赤 (まっか)'],
      },
      {
        char: 'み',
        romaji: 'mi',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['水 (みず)', '道 (みち)'],
      },
      {
        char: 'む',
        romaji: 'mu',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['村 (むら)'],
      },
      {
        char: 'め',
        romaji: 'me',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['目 (め)', '女 (おんな)'],
      },
      {
        char: 'も',
        romaji: 'mo',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['物 (もの)', 'もしかして'],
      },
      {
        char: 'や',
        romaji: 'ya',
        type: 'hiragana',
        complexity: 'simple',
        examples: [],
      },
      {
        char: 'ゆ',
        romaji: 'yu',
        type: 'hiragana',
        complexity: 'simple',
        examples: [],
      },
      {
        char: 'よ',
        romaji: 'yo',
        type: 'hiragana',
        complexity: 'simple',
        examples: [],
      },
      {
        char: 'ら',
        romaji: 'ra',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['良 (ら)'],
      },
      {
        char: 'り',
        romaji: 'ri',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['理解 (りかい)'],
      },
      {
        char: 'る',
        romaji: 'ru',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['冷たい (つめたい)', '留学生 (りゅうがくせい)'],
      },
      {
        char: 'れ',
        romaji: 're',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['礼 (れい)'],
      },
      {
        char: 'ろ',
        romaji: 'ro',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['路 (ろ)'],
      },
      {
        char: 'わ',
        romaji: 'wa',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['私 (わたし)'],
      },
      {
        char: 'を',
        romaji: 'wo',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['を particle'],
      },
      {
        char: 'ん',
        romaji: 'n',
        type: 'hiragana',
        complexity: 'simple',
        examples: ['新聞 (しんぶん)'],
      },

      // Ёон (youon) - Часть диграфов
      {
        char: 'きゃ',
        romaji: 'kya',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['家庭 (かてい)', 'キャベツ'],
      },
      {
        char: 'きゅ',
        romaji: 'kyu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['急 (きゅう)', 'キュウリ'],
      },
      {
        char: 'きょ',
        romaji: 'kyo',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['今日 (きょう)', '協力 (きょうりょく)'],
      },
      {
        char: 'しゃ',
        romaji: 'sha',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['車 (くるま)', '写真 (しゃしん)'],
      },
      {
        char: 'しゅ',
        romaji: 'shu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['秋 (あき)', '修理 (しゅうり)'],
      },
      {
        char: 'しょ',
        romaji: 'sho',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['小説 (しょうせつ)', '書道 (しょどう)'],
      },
      {
        char: 'ちゃ',
        romaji: 'cha',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['茶 (ちゃ)', '父ちゃん (とうちゃん)'],
      },
      {
        char: 'ちゅ',
        romaji: 'chu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['中 (なか)', '注意 (ちゅうい)'],
      },
      {
        char: 'ちょ',
        romaji: 'cho',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['蝶 (ちょう)', '超える (こえる)'],
      },
      {
        char: 'にゃ',
        romaji: 'nya',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['女 (おんな)', 'ニュース'],
      },
      {
        char: 'にゅ',
        romaji: 'nyu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['入浴 (にゅうよく)'],
      },
      {
        char: 'にょ',
        romaji: 'nyo',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['女子 (じょし)', '猫 (ねこ)'],
      }, // Note: ねこ is usually ねこ, but にょ is part of the set
      {
        char: 'ひゃ',
        romaji: 'hya',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['百 (ひゃく)', '評価 (ひょうか)'],
      },
      {
        char: 'ひゅ',
        romaji: 'hyu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['美容 (びよう)', 'ひゅう'],
      },
      {
        char: 'ひょ',
        romaji: 'hyo',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['平和 (へいわ)', '比較 (ひかく)'],
      },
      {
        char: 'みゃ',
        romaji: 'mya',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['魅力 (みりょく)'],
      },
      {
        char: 'みゅ',
        romaji: 'myu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['ミュージック'],
      },
      {
        char: 'みょ',
        romaji: 'myo',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['苗 (なえ)', 'ミョウガ'],
      },
      {
        char: 'りゃ',
        romaji: 'rya',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['両親 (りょうしん)'],
      },
      {
        char: 'りゅ',
        romaji: 'ryu',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['旅行 (りょこう)', '龍 (りゅう)'],
      },
      {
        char: 'りょ',
        romaji: 'ryo',
        type: 'hiragana',
        complexity: 'youon',
        examples: ['了解 (りょうかい)', '両方 (りょうほう)'],
      },

      // Dakuon (dakuon) -浊音
      {
        char: 'が',
        romaji: 'ga',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['学校 (がっこう)', '画 (が)'],
      },
      {
        char: 'ぎ',
        romaji: 'gi',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['技術 (ぎじゅつ)', '義理 (ぎり)'],
      },
      {
        char: 'ぐ',
        romaji: 'gu',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['具合 (ぐあい)', '愚痴 (ぐち)'],
      },
      {
        char: 'げ',
        romaji: 'ge',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['下げる (さげる)', '外 (そと)'],
      },
      {
        char: 'ご',
        romaji: 'go',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['語 (ご)', '御飯 (ごはん)'],
      },
      {
        char: 'ざ',
        romaji: 'za',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['雑誌 (ざっし)', '座る (すわる)'],
      },
      {
        char: 'じ',
        romaji: 'ji',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['字 (じ)', '時間 (じかん)'],
      },
      {
        char: 'ず',
        romaji: 'zu',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['頭 (ず)', '図書館 (としょかん)'],
      },
      {
        char: 'ぜ',
        romaji: 'ze',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['絶対 (ぜったい)'],
      },
      {
        char: 'ぞ',
        romaji: 'zo',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['象 (ぞう)', '底 (そこ)'],
      },
      {
        char: 'だ',
        romaji: 'da',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['大丈夫 (だいじょうぶ)', '田んぼ (たんぼ)'],
      },
      {
        char: 'ぢ',
        romaji: 'ji',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['同じ (おなじ)', '泥棒 (どろぼう)'],
      }, // Альтернативное написание ji
      {
        char: 'づ',
        romaji: 'zu',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['続く (つづく)', '土産 (みやげ)'],
      }, // Альтернативное написание zu
      {
        char: 'で',
        romaji: 'de',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['出る (でる)', '手伝う (てつだう)'],
      },
      {
        char: 'ど',
        romaji: 'do',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['土曜日 (どようび)', 'ドア'],
      },
      {
        char: 'ば',
        romaji: 'ba',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['場所 (ばしょ)', '話 (はなし)'],
      },
      {
        char: 'び',
        romaji: 'bi',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['美術 (びじゅつ)', '鼻 (はな)'],
      },
      {
        char: 'ぶ',
        romaji: 'bu',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['部分 (ぶぶん)', '太鼓 (たいこ)'],
      },
      {
        char: 'べ',
        romaji: 'be',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['別 (べつ)', '便利 (べんり)'],
      },
      {
        char: 'ぼ',
        romaji: 'bo',
        type: 'hiragana',
        complexity: 'dakuon',
        examples: ['ボール', '保険 (ほけん)'],
      },

      // Handakuon (handakuon) - полугласные
      {
        char: 'ぱ',
        romaji: 'pa',
        type: 'hiragana',
        complexity: 'handakuon',
        examples: ['パン', 'パーセント'],
      },
      {
        char: 'ぴ',
        romaji: 'pi',
        type: 'hiragana',
        complexity: 'handakuon',
        examples: ['ピンク', 'ピアノ'],
      },
      {
        char: 'ぷ',
        romaji: 'pu',
        type: 'hiragana',
        complexity: 'handakuon',
        examples: ['プール', '風船 (ふうせん)'],
      },
      {
        char: 'ぺ',
        romaji: 'pe',
        type: 'hiragana',
        complexity: 'handakuon',
        examples: ['ペン', 'ページ'],
      },
      {
        char: 'ぽ',
        romaji: 'po',
        type: 'hiragana',
        complexity: 'handakuon',
        examples: ['ポケット', '保つ (たもつ)'],
      },

      // Сokuон (sokuon) - Удвоение согласной
      {
        char: 'っ',
        romaji: '(tsu)',
        type: 'hiragana',
        complexity: 'sokuon',
        examples: ['切手 (きって)', '雑誌 (ざっし)'],
      }, // Note:_romaji is tricky here

      // Choonpu (choonpu) - Удлинение гласной (чаще в катакане, но бывает)
      // { char: 'ー', romaji: '-', type: 'hiragana', complexity: 'choonpu', examples: [] }, // Обычно в катакане, пропустим для хираганы

      // --- Катакана (Katakana) ---
      // Простые (simple)
      {
        char: 'ア',
        romaji: 'a',
        type: 'katakana',
        complexity: 'simple',
        examples: ['アメリカ'],
      },
      {
        char: 'イ',
        romaji: 'i',
        type: 'katakana',
        complexity: 'simple',
        examples: ['イタリア'],
      },
      {
        char: 'ウ',
        romaji: 'u',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ウール'],
      },
      {
        char: 'エ',
        romaji: 'e',
        type: 'katakana',
        complexity: 'simple',
        examples: ['エレベーター'],
      },
      {
        char: 'オ',
        romaji: 'o',
        type: 'katakana',
        complexity: 'simple',
        examples: ['オレンジ'],
      },
      {
        char: 'カ',
        romaji: 'ka',
        type: 'katakana',
        complexity: 'simple',
        examples: ['カード', 'カメラ'],
      },
      {
        char: 'キ',
        romaji: 'ki',
        type: 'katakana',
        complexity: 'simple',
        examples: ['キッズ', 'キス'],
      },
      {
        char: 'ク',
        romaji: 'ku',
        type: 'katakana',
        complexity: 'simple',
        examples: ['クラス', 'クラブ'],
      },
      {
        char: 'ケ',
        romaji: 'ke',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ケーキ', 'ケータイ'],
      },
      {
        char: 'コ',
        romaji: 'ko',
        type: 'katakana',
        complexity: 'simple',
        examples: ['コーヒー', 'コート'],
      },
      {
        char: 'サ',
        romaji: 'sa',
        type: 'katakana',
        complexity: 'simple',
        examples: ['サービス', 'サンドイッチ'],
      },
      {
        char: 'シ',
        romaji: 'shi',
        type: 'katakana',
        complexity: 'simple',
        examples: ['シール', 'シュークリーム'],
      },
      {
        char: 'ス',
        romaji: 'su',
        type: 'katakana',
        complexity: 'simple',
        examples: ['スポーツ', 'スーパー'],
      },
      {
        char: 'セ',
        romaji: 'se',
        type: 'katakana',
        complexity: 'simple',
        examples: ['セール', 'セルフ'],
      },
      {
        char: 'ソ',
        romaji: 'so',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ソフト', 'ソファー'],
      },
      {
        char: 'タ',
        romaji: 'ta',
        type: 'katakana',
        complexity: 'simple',
        examples: ['タクシー', 'チーム'],
      },
      {
        char: 'チ',
        romaji: 'chi',
        type: 'katakana',
        complexity: 'simple',
        examples: ['チケット', 'チーズ'],
      },
      {
        char: 'ツ',
        romaji: 'tsu',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ツナ', 'ツイッター'],
      },
      {
        char: 'テ',
        romaji: 'te',
        type: 'katakana',
        complexity: 'simple',
        examples: ['テキスト', 'テスト'],
      },
      {
        char: 'ト',
        romaji: 'to',
        type: 'katakana',
        complexity: 'simple',
        examples: ['トイレ', 'トマト'],
      },
      {
        char: 'ナ',
        romaji: 'na',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ナイト', 'ナイス'],
      },
      {
        char: 'ニ',
        romaji: 'ni',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ニュース', 'ニット'],
      },
      {
        char: 'ヌ',
        romaji: 'nu',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ネイティブ'],
      },
      {
        char: 'ネ',
        romaji: 'ne',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ネクタイ', 'ネオン'],
      },
      {
        char: 'ノ',
        romaji: 'no',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ノート', 'ノック'],
      },
      {
        char: 'ハ',
        romaji: 'ha',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ハム', 'ハンバーガー'],
      },
      {
        char: 'ヒ',
        romaji: 'hi',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ヒール', 'ヒント'],
      },
      {
        char: 'フ',
        romaji: 'fu',
        type: 'katakana',
        complexity: 'simple',
        examples: ['フルーツ', 'フライ'],
      },
      {
        char: 'ヘ',
        romaji: 'he',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ヘッド', 'ヘルプ'],
      },
      {
        char: 'ホ',
        romaji: 'ho',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ホテル', 'ホーム'],
      },
      {
        char: 'マ',
        romaji: 'ma',
        type: 'katakana',
        complexity: 'simple',
        examples: ['マグカップ', 'マスコミ'],
      },
      {
        char: 'ミ',
        romaji: 'mi',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ミス', 'ミルク'],
      },
      {
        char: 'ム',
        romaji: 'mu',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ムード', 'メニュー'],
      },
      {
        char: 'メ',
        romaji: 'me',
        type: 'katakana',
        complexity: 'simple',
        examples: ['メール', 'メモ'],
      },
      {
        char: 'モ',
        romaji: 'mo',
        type: 'katakana',
        complexity: 'simple',
        examples: ['モーニング', 'モデル'],
      },
      {
        char: 'ヤ',
        romaji: 'ya',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ヤング', 'ヤマハ'],
      },
      {
        char: 'ユ',
        romaji: 'yu',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ユニフォーム', 'ユニーク'],
      },
      {
        char: 'ヨ',
        romaji: 'yo',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ヨット', 'ヨーグルト'],
      },
      {
        char: 'ラ',
        romaji: 'ra',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ラケット', 'ラッシュ'],
      },
      {
        char: 'リ',
        romaji: 'ri',
        type: 'katakana',
        complexity: 'simple',
        examples: ['リズム', 'リフト'],
      },
      {
        char: 'ル',
        romaji: 'ru',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ルール', 'ルーム'],
      },
      {
        char: 'レ',
        romaji: 're',
        type: 'katakana',
        complexity: 'simple',
        examples: ['レシピ', 'レポート'],
      },
      {
        char: 'ロ',
        romaji: 'ro',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ロボット', 'ロケット'],
      },
      {
        char: 'ワ',
        romaji: 'wa',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ワンルーム', 'ワイシャツ'],
      },
      {
        char: 'ヲ',
        romaji: 'wo',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ヲ particle'],
      },
      {
        char: 'ン',
        romaji: 'n',
        type: 'katakana',
        complexity: 'simple',
        examples: ['ン (n sound)'],
      },

      // Ёон (youon) - Часть диграфов
      {
        char: 'キャ',
        romaji: 'kya',
        type: 'katakana',
        complexity: 'youon',
        examples: ['キャリア', 'キャプテン'],
      },
      {
        char: 'キュ',
        romaji: 'kyu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['キューピッド', 'キュレーション'],
      },
      {
        char: 'キョ',
        romaji: 'kyo',
        type: 'katakana',
        complexity: 'youon',
        examples: ['キャラ', '清潔 (せいけつ)'],
      }, // Note: seiketsu is usually せい, but kyo is part of the set
      {
        char: 'シャ',
        romaji: 'sha',
        type: 'katakana',
        complexity: 'youon',
        examples: ['シャツ', 'シャワー'],
      },
      {
        char: 'シュ',
        romaji: 'shu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['シュガー', 'シューベルト'],
      },
      {
        char: 'ショ',
        romaji: 'sho',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ショック', 'ショパン'],
      },
      {
        char: 'チャ',
        romaji: 'cha',
        type: 'katakana',
        complexity: 'youon',
        examples: ['チャイム', 'チャンス'],
      },
      {
        char: 'チュ',
        romaji: 'chu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['チューリップ', 'チュウカ'],
      },
      {
        char: 'チョ',
        romaji: 'cho',
        type: 'katakana',
        complexity: 'youon',
        examples: ['チョコレート', 'チョップ'],
      },
      {
        char: 'ニャ',
        romaji: 'nya',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ニャンコ'],
      },
      {
        char: 'ニュ',
        romaji: 'nyu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ニュー', 'ニューヨーク'],
      },
      {
        char: 'ニョ',
        romaji: 'nyo',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ニョロニョロ'],
      },
      {
        char: 'ヒャ',
        romaji: 'hya',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ヒャッホー'],
      },
      {
        char: 'ヒュ',
        romaji: 'hyu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ヒューズ'],
      },
      {
        char: 'ヒョ',
        romaji: 'hyo',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ヒョウ'],
      },
      {
        char: 'ミャ',
        romaji: 'mya',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ミャンマー'],
      },
      {
        char: 'ミュ',
        romaji: 'myu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ミュージック', 'ミュウ'],
      },
      {
        char: 'ミョ',
        romaji: 'myo',
        type: 'katakana',
        complexity: 'youon',
        examples: ['ミョウ'],
      },
      {
        char: 'リャ',
        romaji: 'rya',
        type: 'katakana',
        complexity: 'youon',
        examples: ['リャン'],
      },
      {
        char: 'リュ',
        romaji: 'ryu',
        type: 'katakana',
        complexity: 'youon',
        examples: ['リュック', 'リュウ'],
      },
      {
        char: 'リョ',
        romaji: 'ryo',
        type: 'katakana',
        complexity: 'youon',
        examples: ['リョービ'],
      },

      // Dakuon (dakuon)
      {
        char: 'ガ',
        romaji: 'ga',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ガール', 'ガソリン'],
      },
      {
        char: 'ギ',
        romaji: 'gi',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ギター', 'ギフト'],
      },
      {
        char: 'グ',
        romaji: 'gu',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['グループ', 'ガイド'],
      },
      {
        char: 'ゲ',
        romaji: 'ge',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ゲーム', 'ゲスト'],
      },
      {
        char: 'ゴ',
        romaji: 'go',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ゴール', 'ゴミ'],
      },
      {
        char: 'ザ',
        romaji: 'za',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ザック', 'ザ・ビートルズ'],
      },
      {
        char: 'ジ',
        romaji: 'ji',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ジーンズ', 'ジム'],
      },
      {
        char: 'ズ',
        romaji: 'zu',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ズボン', 'ズーム'],
      },
      {
        char: 'ゼ',
        romaji: 'ze',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ゼリー', 'ゼミ'],
      },
      {
        char: 'ゾ',
        romaji: 'zo',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ゾウ'],
      },
      {
        char: 'ダ',
        romaji: 'da',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ダイナマイト'],
      },
      {
        char: 'ヂ',
        romaji: 'ji',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ヂス'],
      }, // Альтернативное ji
      {
        char: 'ヅ',
        romaji: 'zu',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ヅラ'],
      }, // Альтернативное zu
      {
        char: 'デ',
        romaji: 'de',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['デパート', 'デザイン'],
      },
      {
        char: 'ド',
        romaji: 'do',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ドア', 'ドライブ'],
      },
      {
        char: 'バ',
        romaji: 'ba',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['バナナ', 'ベース'],
      },
      {
        char: 'ビ',
        romaji: 'bi',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ビール', 'ビデオ'],
      },
      {
        char: 'ブ',
        romaji: 'bu',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ブドウ', 'ブーム'],
      },
      {
        char: 'ベ',
        romaji: 'be',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ベッド', 'ベル'],
      },
      {
        char: 'ボ',
        romaji: 'bo',
        type: 'katakana',
        complexity: 'dakuon',
        examples: ['ボール', 'ボート'],
      },

      // Handakuon (handakuon)
      {
        char: 'パ',
        romaji: 'pa',
        type: 'katakana',
        complexity: 'handakuon',
        examples: ['パーティー', 'パン'],
      },
      {
        char: 'ピ',
        romaji: 'pi',
        type: 'katakana',
        complexity: 'handakuon',
        examples: ['ピアノ', 'ピンク'],
      },
      {
        char: 'プ',
        romaji: 'pu',
        type: 'katakana',
        complexity: 'handakuon',
        examples: ['プール', 'プラス'],
      },
      {
        char: 'ペ',
        romaji: 'pe',
        type: 'katakana',
        complexity: 'handakuon',
        examples: ['ペン', 'ページ'],
      },
      {
        char: 'ポ',
        romaji: 'po',
        type: 'katakana',
        complexity: 'handakuon',
        examples: ['ポケット', 'ポスター'],
      },

      // Сokuон (sokuon)
      {
        char: 'ッ',
        romaji: '(tsu)',
        type: 'katakana',
        complexity: 'sokuon',
        examples: ['カップ', 'マッチ'],
      },

      // Choonpu (choonpu) - Удлинение гласной
      {
        char: 'ー',
        romaji: '-',
        type: 'katakana',
        complexity: 'choonpu',
        examples: ['コーヒー', 'スーパー'],
      },
    ];

    for (const kana of kanaData) {
      const examplesString = `{${kana.examples.map((e) => `"${e}"`).join(',')}}`;

      await queryRunner.query(
        `
                INSERT INTO "kana" ("char", "romaji", "type", "complexity", "examples", "jlptLevel", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `,
        [
          kana.char,
          kana.romaji,
          kana.type,
          kana.complexity,
          examplesString,
          kana.jlptLevel || null, // Предполагается, что уровень JLPT будет добавлен позже или вручную
        ],
      );
    }
    console.log('Символы каны вставлены/обновлены.');

    // --- 3. Добавление примеров слов (с кандзи в поле "word") ---
    console.log('Вставка примеров слов...');
    const wordData = [
      // Примеры для хираганы (с кандзи)
      {
        word: '愛',
        kana: 'あい',
        romaji: 'ai',
        meaning: 'любовь',
        category: 'эмоции',
        level: 'N5',
      },
      {
        word: '赤',
        kana: 'あか',
        romaji: 'aka',
        meaning: 'красный',
        category: 'цвета',
        level: 'N5',
      },
      {
        word: '朝',
        kana: 'あさ',
        romaji: 'asa',
        meaning: 'утро',
        category: 'время',
        level: 'N5',
      },
      {
        word: '家',
        kana: 'いえ',
        romaji: 'ie',
        meaning: 'дом',
        category: 'места',
        level: 'N5',
      },
      {
        word: '今',
        kana: 'いま',
        romaji: 'ima',
        meaning: 'сейчас',
        category: 'время',
        level: 'N5',
      },
      {
        word: '海',
        kana: 'うみ',
        romaji: 'umi',
        meaning: 'море',
        category: 'природа',
        level: 'N5',
      },
      {
        word: '絵',
        kana: 'え',
        romaji: 'e',
        meaning: 'картина',
        category: 'искусство',
        level: 'N5',
      },
      {
        word: '学校',
        kana: 'がっこう',
        romaji: 'gakkou',
        meaning: 'школа',
        category: 'образование',
        level: 'N5',
      },
      {
        word: '木',
        kana: 'き',
        romaji: 'ki',
        meaning: 'дерево',
        category: 'природа',
        level: 'N5',
      },
      {
        word: '今日',
        kana: 'きょう',
        romaji: 'kyou',
        meaning: 'сегодня',
        category: 'время',
        level: 'N5',
      },
      {
        word: '写真',
        kana: 'しゃしん',
        romaji: 'shashin',
        meaning: 'фотография',
        category: 'медиа',
        level: 'N5',
      },
      {
        word: '本',
        kana: 'ほん',
        romaji: 'hon',
        meaning: 'книга',
        category: 'предметы',
        level: 'N5',
      },
      {
        word: '人',
        kana: 'ひと',
        romaji: 'hito',
        meaning: 'человек',
        category: 'люди',
        level: 'N5',
      },
      {
        word: '日本',
        kana: 'にほん',
        romaji: 'nihon',
        meaning: 'Япония',
        category: 'страны',
        level: 'N5',
      },
      {
        word: '水',
        kana: 'みず',
        romaji: 'mizu',
        meaning: 'вода',
        category: 'природа',
        level: 'N5',
      },
      {
        word: '見る',
        kana: 'みる',
        romaji: 'miru',
        meaning: 'смотреть',
        category: 'глаголы',
        level: 'N5',
      },
      {
        word: '私',
        kana: 'わたし',
        romaji: 'watashi',
        meaning: 'я (вежливая форма)',
        category: 'местоимения',
        level: 'N5',
      },

      // Примеры для катаканы (часто заимствованные слова, кандзи может отсутствовать или быть менее употребительным)
      {
        word: 'アメリカ',
        kana: 'アメリカ',
        romaji: 'amerika',
        meaning: 'Америка',
        category: 'страны',
        level: 'N5',
      },
      {
        word: 'コンピュータ',
        kana: 'コンピュータ',
        romaji: 'konpyuuta',
        meaning: 'компьютер',
        category: 'технологии',
        level: 'N5',
      },
      {
        word: 'テレビ',
        kana: 'テレビ',
        romaji: 'terebi',
        meaning: 'телевизор',
        category: 'техника',
        level: 'N5',
      },
      {
        word: 'コーヒー',
        kana: 'コーヒー',
        romaji: 'ko-hi-',
        meaning: 'кофе',
        category: 'еда',
        level: 'N5',
      },
      {
        word: 'ホテル',
        kana: 'ホテル',
        romaji: 'hoteru',
        meaning: 'отель',
        category: 'путешествия',
        level: 'N5',
      },
      {
        word: 'パン',
        kana: 'パン',
        romaji: 'pan',
        meaning: 'хлеб',
        category: 'еда',
        level: 'N5',
      },

      // Примеры с диакритиками (dakuon/handakuon)
      {
        word: '銀 行',
        kana: 'ぎんこう',
        romaji: 'ginkou',
        meaning: 'банк',
        category: 'финансы',
        level: 'N5',
      }, // Пробел в кандзи для демонстрации
      {
        word: '雑誌',
        kana: 'ざっし',
        romaji: 'zasshi',
        meaning: 'журнал',
        category: 'медиа',
        level: 'N5',
      },
      {
        word: 'デパート',
        kana: 'デパート',
        romaji: 'depa-to',
        meaning: 'универмаг',
        category: 'покупки',
        level: 'N5',
      },
      {
        word: 'パーティー',
        kana: 'パーティー',
        romaji: 'pa-ti-',
        meaning: 'вечеринка',
        category: 'развлечения',
        level: 'N5',
      },
    ];

    for (const word of wordData) {
      await queryRunner.query(
        `
                INSERT INTO "word" ("word", "kana", "romaji", "meaning", "category", "level")
                VALUES ($1, $2, $3, $4, $5, $6)
            `,
        [
          word.word,
          word.kana,
          word.romaji,
          word.meaning,
          word.category,
          word.level,
        ],
      );
    }
    console.log('Примеры слов вставлены/обновлены.');

    // --- 4. Добавление прогресса по кана для пользователей ---
    console.log('Вставка прогресса по кана...');
    if (userId1 && userId2) {
      const kanaForProgressResult = await queryRunner.query(`
                SELECT id, "char" FROM "kana"
                WHERE "char" IN ('あ', 'い', 'か', 'き', 'さ', 'が', 'きゃ', 'ア', 'イ', 'カ', 'ガ', 'キャ')
            `);
      const kanaMap: Record<string, number> = {};
      kanaForProgressResult.forEach((k: { id: number; char: string }) => {
        kanaMap[k.char] = k.id;
      });

      const progressData = [
        // Прогресс для пользователя 1
        {
          userId: userId1,
          kanaId: kanaMap['あ'],
          progress: 100,
          correctAttempts: 10,
          incorrectAttempts: 0,
          perceivedDifficulty: 1,
          stage: 'mastered',
        },
        {
          userId: userId1,
          kanaId: kanaMap['い'],
          progress: 80,
          correctAttempts: 8,
          incorrectAttempts: 2,
          perceivedDifficulty: 2,
          stage: 'review',
        },
        {
          userId: userId1,
          kanaId: kanaMap['か'],
          progress: 50,
          correctAttempts: 5,
          incorrectAttempts: 3,
          perceivedDifficulty: 2,
          stage: 'learning',
        },
        {
          userId: userId1,
          kanaId: kanaMap['き'],
          progress: 30,
          correctAttempts: 2,
          incorrectAttempts: 4,
          perceivedDifficulty: 3,
          stage: 'learning',
        },
        {
          userId: userId1,
          kanaId: kanaMap['が'],
          progress: 20,
          correctAttempts: 1,
          incorrectAttempts: 5,
          perceivedDifficulty: 3,
          stage: 'new',
        },
        {
          userId: userId1,
          kanaId: kanaMap['きゃ'],
          progress: 10,
          correctAttempts: 0,
          incorrectAttempts: 3,
          perceivedDifficulty: 4,
          stage: 'new',
        },

        // Прогресс для пользователя 2
        {
          userId: userId2,
          kanaId: kanaMap['ア'],
          progress: 90,
          correctAttempts: 9,
          incorrectAttempts: 1,
          perceivedDifficulty: 1,
          stage: 'review',
        },
        {
          userId: userId2,
          kanaId: kanaMap['イ'],
          progress: 70,
          correctAttempts: 7,
          incorrectAttempts: 2,
          perceivedDifficulty: 2,
          stage: 'learning',
        },
        {
          userId: userId2,
          kanaId: kanaMap['カ'],
          progress: 10,
          correctAttempts: 1,
          incorrectAttempts: 8,
          perceivedDifficulty: 4,
          stage: 'new',
        },
        {
          userId: userId2,
          kanaId: kanaMap['ガ'],
          progress: 40,
          correctAttempts: 3,
          incorrectAttempts: 3,
          perceivedDifficulty: 2,
          stage: 'learning',
        },
        {
          userId: userId2,
          kanaId: kanaMap['キャ'],
          progress: 25,
          correctAttempts: 1,
          incorrectAttempts: 4,
          perceivedDifficulty: 3,
          stage: 'new',
        },
      ];

      for (const progress of progressData) {
        if (progress.kanaId) {
          await queryRunner.query(
            `
                        INSERT INTO "kana_progress" ("userId", "kanaId", "progress", "correctAttempts", "incorrectAttempts", "perceivedDifficulty", "stage", "createdAt")
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                        ON CONFLICT ("userId", "kanaId") DO UPDATE SET
                            "progress" = EXCLUDED."progress",
                            "correctAttempts" = EXCLUDED."correctAttempts",
                            "incorrectAttempts" = EXCLUDED."incorrectAttempts",
                            "perceivedDifficulty" = EXCLUDED."perceivedDifficulty",
                            "stage" = EXCLUDED."stage";
                    `,
            [
              progress.userId,
              progress.kanaId,
              progress.progress,
              progress.correctAttempts,
              progress.incorrectAttempts,
              progress.perceivedDifficulty,
              progress.stage,
            ],
          );
        } else {
          console.warn(
            `Kana с символом для прогресса не найдена: ${Object.keys(kanaMap).find((key) => kanaMap[key] === progress.kanaId) || 'Unknown'}`,
          );
        }
      }
      console.log('Прогресс по кана вставлен/обновлен.');
    } else {
      console.warn(
        'Не удалось получить ID пользователей для создания прогресса.',
      );
    }

    console.log('Миграция SeedKanaUsersWordsAndProgress завершена успешно.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Откат миграции SeedKanaUsersWordsAndProgress...');

    // Удаление тестовых пользователей (и связанных данных, если CASCADE настроено)
    await queryRunner.query(
      `DELETE FROM "user" WHERE username IN ('test_user_1', 'test_user_2');`,
    );
    console.log('Тестовые пользователи удалены.');

    // Удаление вставленных/обновленных слов (осторожно!)
    // Это удалит слова по кане. Убедитесь, что это безопасно.
    // В реальном проекте лучше использовать флаг is_seed или отдельную таблицу.
    await queryRunner.query(`
      DELETE FROM "word" WHERE "kana" IN
                               ('あい', 'あか', 'あさ', 'いえ', 'いま', 'うみ', 'え', 'がっこう', 'き', 'きょう', 'しゃしん', 'ほん', 'ひと', 'にほん', 'みず', 'みる', 'わたし',
                                'アメリカ', 'コンピュータ', 'テレビ', 'コーヒー', 'ホテル', 'パン', 'ぎんこう', 'ざっし', 'デパート', 'パーティー');
    `);
    console.log('Примеры слов удалены.');

    // Сброс поля examples в таблице kana для затронутых символов
    // Поскольку мы не удаляем символы, просто очищаем примеры.
    // В реальном проекте можно было бы удалить только сид-данные.
    await queryRunner.query(`
            UPDATE "kana"
            SET "examples" = '{}'
            WHERE "char" IN
            ('あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ',
             'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ',
             'ま', 'み', 'む', 'め', 'も', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん',
             'きゃ', 'きゅ', 'きょ', 'しゃ', 'しゅ', 'しょ', 'ちゃ', 'ちゅ', 'ちょ', 'にゃ', 'にゅ', 'にょ',
             'ひゃ', 'ひゅ', 'ひょ', 'みゃ', 'みゅ', 'みょ', 'りゃ', 'りゅ', 'りょ',
             'が', 'ぎ', 'ぐ', 'げ', 'ご', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'だ', 'ぢ', 'づ', 'で', 'ど',
             'ば', 'び', 'ぶ', 'べ', 'ぼ',
             'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
             'っ', 'ー',
             'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ',
             'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
             'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン',
             'キャ', 'キュ', 'キョ', 'シャ', 'シュ', 'ショ', 'チャ', 'チュ', 'チョ', 'ニャ', 'ニュ', 'ニョ',
             'ヒャ', 'ヒュ', 'ヒョ', 'ミャ', 'ミュ', 'ミョ', 'リャ', 'リュ', 'リョ',
             'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド',
             'バ', 'ビ', 'ブ', 'ベ', 'ボ',
             'パ', 'ピ', 'プ', 'ペ', 'ポ',
             'ッ', 'ー');
        `);
    console.log('Поле examples сброшено для всех символов.');

    // Прогресс должен был удалиться каскадом при удалении пользователей.
    // Если нет, его можно удалить напрямую:
    // await queryRunner.query(`DELETE FROM "kana_progress" WHERE "userId" IN (SELECT id FROM "user" WHERE username IN ('test_user_1', 'test_user_2'));`);

    console.log('Откат миграции SeedKanaUsersWordsAndProgress завершен.');
  }
}
