import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Word } from '@/word/entities/word.entity';
import { Kanji } from '@/kanji/entities/kanji.entity';
import { Grammar } from '@/grammar/entities/grammar.entity';
import { Progress } from '@/progress/entities/progress.entity';

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column('json')
  exercises: string[]; // типы упражнений (например: ["fill-in-the-blank", "sentence-building", "particle-insertion"])

  @Column()
  status: 'locked' | 'in_progress' | 'completed';

  @Column('json')
  requiredKanji: number[]; // иероглифы, которые пользователь должен знать перед прохождением урока

  @OneToMany(() => Word, (word) => word)
  @JoinTable()
  words: Word[];

  @OneToMany(() => Kanji, (kanji) => kanji)
  @JoinTable()
  kanji: Kanji[];

  @ManyToMany(() => Grammar, (grammar) => grammar.lessons)
  @JoinTable()
  grammar: Grammar[];

  @OneToMany(() => Progress, (progress) => progress.kanji)
  progress: Progress;
}
