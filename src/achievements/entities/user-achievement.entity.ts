// user-achievement.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { Achievement } from '@/achievements/entities/achievement.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity()
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userAchievements, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Achievement, { onDelete: 'CASCADE' })
  achievement: Achievement;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  earnedAt: Date;
}
