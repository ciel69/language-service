import { Entity, Unique, Index, ManyToOne, JoinColumn, Column } from 'typeorm';

import { Lesson } from '@/modules/lesson/entities/lesson.entity';
import { BaseProgress } from './base-progress.entity';

@Entity()
@Unique(['userId', 'lessonId'])
@Index(['userId'])
@Index(['lessonId'])
@Index(['updatedAt'])
@Index(['progress'])
export class LessonProgress extends BaseProgress {
  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column()
  lessonId: number;

  // --- Специфичные поля для урока ---
  /**
   * Статус завершения урока
   * 'not_started' - не начат, 'in_progress' - в процессе, 'completed' - завершен
   */
  @Column({
    type: 'enum',
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  })
  status: 'not_started' | 'in_progress' | 'completed';

  /**
   * Общее количество элементов (слов, кандзи и т.д.) в уроке
   */
  @Column({ type: 'integer', default: 0 })
  totalItems: number;

  /**
   * Количество элементов, успешно изученных пользователем в этом уроке
   */
  @Column({ type: 'integer', default: 0 })
  completedItems: number;

  @Column({
    type: 'enum',
    enum: ['excellent', 'good', 'pass', 'fail'],
    nullable: true, // пока не все уроки имеют оценку
  })
  score: 'excellent' | 'good' | 'pass' | 'fail' | null;
  // --- Конец специфичных полей ---
}
