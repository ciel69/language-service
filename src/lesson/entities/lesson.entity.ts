import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Word } from '@/word/entities/word.entity';
import { Kanji } from '@/kanji/entities/kanji.entity';
import { Kana } from '@/kana/entities/kana.entity';
import { Grammar } from '@/grammar/entities/grammar.entity';
import { LessonProgress } from '@/progress/entities/lesson-progress.entity';
import { LessonTask } from './lesson-task.entity';
import { LessonModule } from '@/lesson/entities/lesson-module.entity';

export const LESSON_STATUS_VALUES = [
  'locked',
  'in_progress',
  'completed',
] as const;

export type LessonStatus = (typeof LESSON_STATUS_VALUES)[number];

@Entity()
@Index(['status'])
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('simple-array')
  exerciseTypes: string[];

  /**
   * Порядковый номер урока в модуле.
   */
  @Column({ type: 'int' })
  order: number;

  @Column({
    type: 'enum',
    enum: LESSON_STATUS_VALUES,
    default: 'locked',
  })
  status: LessonStatus;

  // --- НОВАЯ СВЯЗЬ: Принадлежность к модулю ---
  /**
   * Модуль урока (точка на карте), к которому принадлежит этот урок.
   * Связь Many-to-One.
   */
  @ManyToOne(() => LessonModule, (module) => module.lessons, {
    onDelete: 'CASCADE', // При удалении модуля удаляются уроки?
    eager: false,
  })
  @JoinColumn({ name: 'moduleId' }) // <-- Добавлено поле внешнего ключа
  module: LessonModule;

  @Column() // <-- Добавлено поле внешнего ключа
  moduleId: number;
  // --- КОНЕЦ НОВОЙ СВЯЗИ ---

  @ManyToMany(() => Word, { cascade: true })
  @JoinTable({
    name: 'lesson_words',
  })
  words: Word[];

  @ManyToMany(() => Kanji, { cascade: true })
  @JoinTable({
    name: 'lesson_kanji',
  })
  kanji: Kanji[];

  @ManyToMany(() => Kana, { cascade: true })
  @JoinTable({
    name: 'lesson_kana',
  })
  kana: Kana[];

  @ManyToMany(() => Grammar, (grammar) => grammar.lessons)
  @JoinTable({
    name: 'lesson_grammar',
  })
  grammar: Grammar[];

  @OneToMany(() => LessonTask, (task) => task.lesson, {
    cascade: true,
    eager: false,
  })
  tasks: LessonTask[];

  @ManyToMany(() => Kanji)
  @JoinTable({
    name: 'lesson_prerequisites_kanji',
  })
  prerequisiteKanji: Kanji[];

  @ManyToMany(() => Kana)
  @JoinTable({
    name: 'lesson_prerequisites_kana',
  })
  prerequisiteKana: Kana[];

  @OneToMany(() => LessonProgress, (progress) => progress.lesson)
  progress: LessonProgress[];

  // --- Временные метки (если нужно) ---
  // @CreateDateColumn()
  // createdAt: Date;
  // @UpdateDateColumn()
  // updatedAt: Date;
  // --- Конец временных меток ---
}
