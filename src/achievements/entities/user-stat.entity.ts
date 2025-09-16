import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

/**
 * Хранит агрегированные статистические показатели пользователя.
 * Используется для быстрой проверки условий достижений без JOIN к таблицам прогресса.
 *
 * Обновляется асинхронно при каждом значимом действии (завершение урока, изучение слова и т.д.).
 */
@Entity('user_stat')
export class UserStat {
  @PrimaryColumn({ type: 'integer' })
  userId: number;

  /**
   * Связь с пользователем (для целостности и удобства ORM).
   */
  @OneToOne(() => User, (user) => user.stat)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Количество пройденных уроков.
   */
  @Column({ type: 'integer', default: 0 })
  lessonsCompleted: number;

  /**
   * Количество выученных слов (статус mastered или выше).
   */
  @Column({ type: 'integer', default: 0 })
  wordsLearned: number;

  /**
   * Количество освоенных кана (все символы уровня N5/N4 и т.д.).
   */
  @Column({ type: 'integer', default: 0 })
  kanaMastered: number;

  /**
   * Текущая серия ежедневных входов (стрик).
   */
  @Column({ type: 'integer', default: 0 })
  streakDays: number;

  /**
   * Общее количество очков, набранных за достижения и активность.
   */
  @Column({ type: 'integer', default: 0 })
  totalPoints: number;

  /**
   * Последнее действие пользователя (для определения "сегодня" в UTC).
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivity: Date;

  /**
   * Суммарное количество очков, набранных сегодня (для достижений типа "100 очков за день").
   */
  @Column({ type: 'integer', default: 0 })
  dailyPoints: number;
}
