import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Lesson } from '@/lesson/entities/lesson.entity';

@Entity()
export class Grammar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sentence: string; // пример предложения

  @Column()
  explanation: string; // объяснение грамматики

  @Column('json')
  exercises: string[]; // упражнения (например: "Собери предложение", "Дополни предложение", "Выбери правильную частицу")

  @ManyToMany(() => Lesson, (lesson) => lesson.grammar)
  @JoinTable()
  lessons: Lesson[];
}
