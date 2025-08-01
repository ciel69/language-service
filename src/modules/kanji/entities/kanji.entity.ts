import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';

import { Word } from '@/modules/word/entities/word.entity';
import { KanjiProgress } from '@/modules/progress/entities/kanji-progress.entity';

/**
 * Сущность, представляющая японский иероглиф (кандзи).
 * Хранит информацию о самом символе, его чтениях, значении и связях.
 */
@Entity()
@Unique(['char']) // Гарантирует уникальность самого символа кандзи
@Index(['level']) // Индекс для быстрой фильтрации по уровню JLPT
export class Kanji {
  /**
   * Уникальный идентификатор кандзи.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Сам символ кандзи.
   * @example "一", "二", "人", "水"
   */
  @Column({ type: 'varchar', length: 10, unique: true }) // Явно указываем длину и уникальность
  char: string;

  /**
   * Он-чтения (онъёми) кандзи.
   * Чтения китайского происхождения, часто используются в сложных словах.
   * @example ["イチ", "イツ"] для 一
   */
  @Column('simple-array') // Используем simple-array для массива строк
  on: string[];

  /**
   * Кун-чтения (кунъёми) кандзи.
   * Японские чтения, часто используются, когда кандзи встречается отдельно или в грамматических конструкциях.
   * @example ["ひと", "ひとな"] для 人
   */
  @Column('simple-array') // Используем simple-array для массива строк
  kun: string[];

  /**
   * Основное или наиболее частое значение кандзи.
   * @example "один" для 一, "человек" для 人
   */
  @Column({ type: 'varchar', length: 500 }) // Указываем разумную длину
  meaning: string;

  /**
   * Уровень сложности по шкале JLPT (Japanese Language Proficiency Test).
   * @example 'N5' - самый базовый уровень, 'N1' - продвинутый уровень.
   */
  @Column({
    type: 'enum',
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
  })
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  /**
   * Слова, в которых используется этот кандзи.
   * Связь многие-ко-многим позволяет одному кандзи быть частью множества слов
   * и одному слову состоять из множества кандзи.
   */
  @ManyToMany(() => Word, (word) => word.kanji)
  @JoinTable() // Уточняем, что эта сторона отвечает за таблицу связи
  words: Word[];

  /**
   * Записи прогресса пользователей по изучению этого конкретного кандзи.
   * Связь один-ко-многим: один кандзи может иметь множество записей прогресса
   * (по одной для каждого пользователя, который его изучает).
   */
  @OneToMany(() => KanjiProgress, (progress) => progress.kanji)
  progress: KanjiProgress[];
}
