// src/lesson/entities/lesson-theory-page.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LessonModule } from '@/modules/lesson/entities/lesson-module.entity';
import { Lesson } from '@/modules/lesson/entities/lesson.entity';
import { LearningSection } from '@/modules/learning/entities/learning-section.entity';

/**
 * Теоретическая страница (статья, объяснение).
 * Может принадлежать разделу, модулю или уроку.
 * Используется для отображения правил, грамматики и пояснений к заданиям.
 */
@Entity('lesson_theory_page')
@Index(['lessonId', 'order'])
@Index(['moduleId', 'order'])
@Index(['sectionId', 'order'])
export class LessonTheoryPage {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Заголовок статьи
   */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /**
   * Тело статьи (Markdown/HTML/Plain Text).
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Порядок внутри родителя (для сортировки).
   */
  @Column({ type: 'int', default: 0 })
  order: number;

  // --- Привязка к разделу ---
  @ManyToOne(() => LearningSection, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sectionId' })
  section?: LearningSection;

  @Column({ nullable: true })
  sectionId?: number;

  // --- Привязка к модулю ---
  @ManyToOne(() => LessonModule, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'moduleId' })
  module?: LessonModule;

  @Column({ nullable: true })
  moduleId?: number;

  // --- Привязка к уроку ---
  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @Column({ nullable: true })
  lessonId?: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
