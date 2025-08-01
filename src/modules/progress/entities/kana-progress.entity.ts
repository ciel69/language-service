import { Entity, Unique, Index, ManyToOne, JoinColumn, Column } from 'typeorm';

import { Kana } from '@/modules/kana/entities/kana.entity';
import { BaseProgress } from './base-progress.entity';

@Entity()
@Unique(['userId', 'kanaId'])
@Index(['userId'])
@Index(['kanaId'])
@Index(['updatedAt'])
@Index(['nextReviewAt'])
@Index(['progress'])
export class KanaProgress extends BaseProgress {
  @ManyToOne(() => Kana, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'kanaId' })
  kana: Kana;

  @Column()
  kanaId: number;
  // Специфичные поля для KanaProgress (если нужны) можно добавить здесь
}
