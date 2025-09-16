import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Achievement } from './achievement.entity';
import { User } from '@/modules/user/entities/user.entity';

/**
 * Фиксирует факт получения пользователем достижения.
 * Поддерживает частичный прогресс (например: "выучено 3 из 5 слов").
 */
@Entity('user_achievement')
@Index(['userId'])
@Index(['achievementId'])
@Index(['isAchieved'])
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Пользователь, который получил достижение.
   */
  @ManyToOne(() => User, (user) => user.achievements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'integer' })
  userId: number;

  /**
   * Ссылка на шаблон достижения.
   */
  @ManyToOne(() => Achievement, (achievement) => achievement.userAchievements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'achievement_id' })
  achievement: Achievement;

  @Column({ type: 'integer' })
  achievementId: number;

  /**
   * Когда пользователь полностью выполнил условие и получил достижение.
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  achievedAt: Date;

  /**
   * Текущий прогресс (если достижение частичное).
   * Например: если условие — "выучить 10 слов", а пользователь выучил 7 → progress = 7.
   * Для мгновенных достижений (например, "первый урок") — всегда 0 или 1.
   */
  @Column({ type: 'integer', default: 0 })
  progress: number;

  /**
   * True, если пользователь полностью выполнил условие.
   * Используется для отображения значков в профиле.
   */
  @Column({ type: 'boolean', default: false })
  isAchieved: boolean;

  /**
   * Дополнительные метаданные — например, ID последнего слова, которое дало достижение.
   * Полезно для аналитики и уведомлений.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * Время создания записи (может отличаться от achievedAt, если прогресс накапливался).
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
