import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Kanji } from '@/kanji/entities/kanji.entity';

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
}
