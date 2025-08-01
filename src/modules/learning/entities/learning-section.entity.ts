import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LessonModule } from '@/modules/lesson/entities/lesson-module.entity';

@Entity()
@Index(['order'])
export class LearningSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  shortDescription: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  themeColor: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => LessonModule, (module) => module.learningSection)
  modules: LessonModule[];

  // --- Связь с прогрессом по разделу (если будет создана) ---
  // @OneToMany(() => LearningSectionProgress, (progress) => progress.learningSection)
  // progress: LearningSectionProgress[];
  // --- Конец связи с прогрессом ---
}
