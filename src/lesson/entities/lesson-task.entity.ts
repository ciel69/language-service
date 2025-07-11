import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lesson } from '@/lesson/entities/lesson.entity';

@Entity()
export class LessonTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Lesson, (lesson) => lesson)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column()
  lessonId: number;

  @Column()
  taskId: number;

  @Column()
  type: 'word' | 'kanji' | 'grammar' | 'custom_word' | 'custom_grammar';

  @Column('int', { nullable: true })
  wordId?: number;

  @Column('int', { nullable: true })
  kanjiId?: number;

  @Column('int', { nullable: true })
  grammarId?: number;

  @Column('int', { nullable: true })
  customWordId?: number;

  @Column('int', { nullable: true })
  customGrammarId?: number;

  @Column()
  order: number;

  @Column()
  status: 'locked' | 'in_progress' | 'completed';
}
