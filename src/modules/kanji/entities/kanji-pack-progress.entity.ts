// kanji-pack-progress.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { KanjiPack } from './kanji-pack.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity('kanji_pack_progress')
@Index(['user'])
@Index(['progress'])
@Index(['updatedAt'])
export class KanjiPackProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => KanjiPack, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packId' })
  pack: KanjiPack;

  @Column()
  packId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Идентификатор пользователя.
   * Хранится как отдельный столбец для удобства запросов и индексации.
   */
  @Column()
  userId: number;

  /**
   * Процент изученности элемента (от 0 до 100).
   * 0 - элемент не начат, 100 - элемент полностью изучен/освоен.
   * Это основная метрика прогресса.
   */
  @Column({ type: 'integer', default: 0 })
  progress: number; // 0–100

  @Column({ type: 'int', default: 0 })
  learnedCount: number;

  @Column({ type: 'int' })
  totalCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
