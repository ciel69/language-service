import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('user_daily_activity')
@Index(['userId'])
@Index(['date'])
export class UserDailyActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  /**
   * Дата активности (без времени)
   */
  @Column({ type: 'date' })
  date: Date;

  /**
   * Был ли пользователь активен в этот день?
   * (т.е. прошёл хотя бы один урок)
   */
  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  /**
   * Была ли эта активность “спасена” заморозкой?
   * То есть: пользователь **не** прошёл урок, но использовал freezeToken.
   */
  @Column({ type: 'boolean', default: false })
  isFrozen: boolean;

  /**
   * Валюта, начисленная за этот день (если был активен)
   */
  @Column({ type: 'integer', default: 0 })
  currencyEarned: number;

  /**
   * Количество уроков, завершённых в этот день
   */
  @Column({ type: 'integer', default: 0 })
  lessonsCompleted: number;

  /**
   * Когда запись была создана
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
