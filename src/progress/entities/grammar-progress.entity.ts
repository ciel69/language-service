import { Entity, Unique, Index, ManyToOne, JoinColumn, Column } from 'typeorm';

import { Grammar } from '@/grammar/entities/grammar.entity';
import { BaseProgress } from './base-progress.entity';

@Entity()
@Unique(['userId', 'grammarId'])
@Index(['userId'])
@Index(['grammarId'])
@Index(['updatedAt'])
@Index(['progress'])
export class GrammarProgress extends BaseProgress {
  @ManyToOne(() => Grammar, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'grammarId' })
  grammar: Grammar;

  @Column()
  grammarId: number;
  // Специфичные поля для GrammarProgress (если нужны) можно добавить здесь
}
