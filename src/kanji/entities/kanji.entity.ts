import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
} from 'typeorm';

import { Word } from '@/word/entities/word.entity';
import { KanjiProgress } from '@/progress/entities/kanji-progress.entity';

@Entity()
export class Kanji {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  char: string; // иероглиф

  @Column('json')
  on: string[]; // он-чери

  @Column('json')
  kun: string[]; // кун-чери

  @Column()
  meaning: string;

  @Column()
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  @ManyToMany(() => Word, (word) => word.kanji)
  words: Word[];

  @OneToMany(() => KanjiProgress, (progress) => progress.kanji)
  progress: KanjiProgress;
}
