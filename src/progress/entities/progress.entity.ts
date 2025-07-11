import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/user/entities/user.entity';
import { LessonTask } from '@/lesson/entities/lesson-task.entity';

@Entity()
export class Progress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.progress)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => LessonTask, (task) => task)
  @JoinColumn({ name: 'taskId' })
  task: LessonTask;

  @Column()
  taskId: number;

  @Column('integer')
  progress: number; // 0–100

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}
