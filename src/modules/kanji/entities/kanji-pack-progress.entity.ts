// kanji-pack-progress.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KanjiPack } from './kanji-pack.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity('kanji_pack_progress')
export class KanjiPackProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => KanjiPack, { onDelete: 'CASCADE' })
  pack: KanjiPack;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'int', default: 0 })
  learnedCount: number;

  @Column({ type: 'int' })
  totalCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
