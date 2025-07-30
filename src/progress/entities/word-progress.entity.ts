import { Entity, Unique, Index, ManyToOne, JoinColumn, Column } from 'typeorm';

import { Word } from '@/word/entities/word.entity';
import { BaseProgress } from './base-progress.entity';

@Entity()
@Unique(['userId', 'wordId'])
@Index(['userId'])
@Index(['wordId'])
@Index(['updatedAt'])
@Index(['progress'])
export class WordProgress extends BaseProgress {
  @ManyToOne(() => Word, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'wordId' })
  word: Word;

  @Column() // Не забудьте импортировать Column
  wordId: number;
}
