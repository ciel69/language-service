import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';

import { BaseProgress } from './base-progress.entity';
import { LessonModule } from '@/lesson/entities/lesson-module.entity';

@Entity()
@Unique(['userId', 'moduleId'])
@Index(['userId'])
@Index(['moduleId'])
@Index(['updatedAt'])
export class LessonModuleProgress extends BaseProgress {
  @ManyToOne(() => LessonModule, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'moduleId' })
  module: LessonModule;

  @Column()
  moduleId: number;
}
