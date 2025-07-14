import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { Progress } from '@/progress/entities/progress.entity';

@Entity()
export class Grammar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sentence: string; // полное предложение

  @Column()
  explanation: string; // объяснение грамматики

  @Column()
  type:
    | 'particle-choice'
    | 'sentence-building'
    | 'fill-in-the-blank'
    | 'word-order'
    | 'multiple-choice';

  @Column('json')
  options: string[]; // массив вариантов (частицы или слова)

  @Column()
  correctAnswer: string; // правильный ответ

  @Column()
  translation: string; // перевод задания

  @ManyToMany(() => Lesson, (lesson) => lesson.grammar)
  @JoinTable()
  lessons: Lesson[];

  @OneToMany(() => Progress, (progress) => progress.kanji)
  progress: Progress;
}
