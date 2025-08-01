import { Entity, Unique, Index, ManyToOne, JoinColumn, Column } from 'typeorm';

import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { BaseProgress } from './base-progress.entity';

@Entity()
@Unique(['userId', 'kanjiId'])
@Index(['userId'])
@Index(['kanjiId'])
@Index(['updatedAt'])
@Index(['progress'])
export class KanjiProgress extends BaseProgress {
  @ManyToOne(() => Kanji, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'kanjiId' })
  kanji: Kanji;

  @Column()
  kanjiId: number;

  /**
   * Прогресс по написанию кандзи (например, 0-100% для каждого штриха)
   * Может храниться как JSON или в отдельной таблице.
   * Пример: { "stroke_1": 80, "stroke_2": 50, ... }
   */
  @Column({ type: 'json', nullable: true })
  writingProgress: Record<string, number> | null;
  // --- Конец специфичного поля ---
}
