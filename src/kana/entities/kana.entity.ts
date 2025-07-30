import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';

import { KanaProgress } from '@/progress/entities/kana-progress.entity';

export type KanaType = 'hiragana' | 'katakana';
export type KanaComplexity =
  | 'simple' // Одиночные символы (а, ка, са...)
  | 'digraph' // Диграфы (без диакритик) (кя, ша, тю...)
  | 'dakuon' // Dakuon -浊音 (га, за, да, ба)
  | 'handakuon' // Handakuon - полугласные (па, пи, пу, пе, по)
  | 'youon' // Ёон (часть диграфов с ю/я/ё) - можно оставить или заменить на более конкретные
  | 'sokuon' // Сokuон (удвоение согласной: っ)
  | 'choonpu' // Choonpu (удлинение гласной: ー)
  | 'combo' // Комбинированные (если нужно) - можно удалить или уточнить
  | 'complex'; // Для особых случаев

@Entity()
@Index(['char', 'type']) // Для быстрого поиска по символу и типу
@Index(['complexity']) // Для фильтрации по сложности
export class Kana {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Символ каны (например: あ, ア, か, カ, が, ぎゃ, っ, ー)
   */
  @Column({ type: 'varchar', length: 10, unique: true })
  char: string;

  /**
   * Ромадзи-представление (например: a, ka, ga, gya, kku, kaa)
   */
  @Column({ type: 'varchar', length: 20 })
  romaji: string;

  /**
   * Тип азбуки: хирагана или катакана
   */
  @Column({
    type: 'enum',
    enum: ['hiragana', 'katakana'],
  })
  type: KanaType;

  /**
   * Уровень сложности символа
   */
  @Column({
    type: 'enum',
    enum: [
      'simple',
      'digraph',
      'dakuon',
      'handakuon',
      'youon',
      'sokuon',
      'choonpu',
      'combo',
      'complex',
    ],
    default: 'simple',
  })
  complexity: KanaComplexity;

  /**
   * Примеры использования в словах
   * @example ["あい", "あか", "あさ"]
   */
  @Column('simple-array')
  examples: string[];

  /**
   * Уровень JLPT (если применимо)
   */
  @Column({
    type: 'enum',
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    nullable: true,
  })
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  /**
   * Связанные записи прогресса пользователей для этого символа
   */
  @OneToMany(() => KanaProgress, (kanaProgress) => kanaProgress.kana)
  progress: KanaProgress[];

  /**
   * Дата создания записи
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
