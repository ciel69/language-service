import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '@/user/entities/user.entity';
import { Word } from '@/word/entities/word.entity';
import { Kanji } from '@/kanji/entities/kanji.entity';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { Grammar } from '@/grammar/entities/grammar.entity';

@Entity()
export class Progress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.progress)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Word, (word) => word.progress)
  @JoinColumn({ name: 'wordId' })
  word: Word;

  @Column('int', { nullable: true })
  wordId?: number;

  @ManyToOne(() => Kanji, (kanji) => kanji.progress)
  @JoinColumn({ name: 'kanjiId' })
  kanji: Kanji;

  @Column('int', { nullable: true })
  kanjiId?: number;

  @ManyToOne(() => Lesson, (lesson) => lesson.progress)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column('int', { nullable: true })
  lessonId?: number;

  @ManyToOne(() => Grammar, (grammar) => grammar.progress)
  @JoinColumn({ name: 'grammarId' })
  grammar: Grammar;

  @Column('int', { nullable: true })
  grammarId?: number;

  @Column('integer')
  progress: number; // 0–100

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
