import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Kanji } from '@/kanji/entities/kanji.entity';
import { Progress } from '@/progress/entities/progress.entity';

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

  @OneToMany(() => Progress, (progress) => progress.word)
  progress: Progress;
}
