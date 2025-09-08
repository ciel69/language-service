import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Kanji } from './kanji.entity';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';

@Entity('kanji_pack')
@Index(['level', 'order'])
export class KanjiPack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
  })
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Kanji, (kanji) => kanji.pack)
  kanji: Kanji[];

  @OneToMany(() => KanjiPackProgress, (progress) => progress.pack)
  progress: KanjiPackProgress[];
}
