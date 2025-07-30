import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

import { Kanji } from '@/kanji/entities/kanji.entity';
import { Grammar } from '@/grammar/entities/grammar.entity';
import { WordProgress } from '@/progress/entities/word-progress.entity';

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  word: string; // кандзи

  @Column()
  kana: string; // кана

  @Column()
  romaji: string; // ромадзи

  @Column()
  meaning: string;

  @Column()
  category: string;

  @Column()
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  @ManyToMany(() => Kanji, (kanji) => kanji.words)
  @JoinTable()
  kanji: Kanji[];

  @ManyToMany(() => Grammar, (grammar) => grammar.words)
  @JoinTable()
  grammar: Grammar[];

  @OneToMany(() => WordProgress, (progress) => progress.word)
  progress: WordProgress;
}
