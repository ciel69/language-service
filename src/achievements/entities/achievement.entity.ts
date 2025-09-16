import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AchievementCategory } from '../enums/achievement-category.enum';
import { UserAchievement } from '@/achievements/entities/user-achievement.entity';

/**
 * Определяет шаблон достижения — что нужно сделать, чтобы его получить.
 * Хранит условия в формате JSONB для гибкости (например: "выучить 5 слов", "пройти 7 уроков подряд").
 */
@Entity('achievement')
@Index(['category'])
@Index(['is_hidden'])
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Название достижения (для админки и UI).
   * Уникально для предотвращения дубликатов.
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  title: string;

  /**
   * Описание, показываемое пользователю при получении.
   */
  @Column({ type: 'text' })
  description: string;

  //  имя иконки Heroicons
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: 'book-open',
  })
  icon: string; // Например: "book-open", "star", "clock"

  /**
   * Категория достижения — влияет на группировку в профиле.
   */
  @Column({
    type: 'enum',
    enum: AchievementCategory,
    default: AchievementCategory.LEARNING,
  })
  category: AchievementCategory;

  @OneToMany(() => UserAchievement, (ua) => ua.achievement)
  userAchievements: UserAchievement[];

  /**
   * Бонусные очки, начисляемые за достижение (можно использовать для рейтинга).
   */
  @Column({ type: 'integer', default: 0 })
  points: number;

  /**
   * Условие активации — в формате JSONB.
   * Примеры:
   *   { "type": "word_count", "value": 1 }
   *   { "type": "lesson_completed", "value": 10 }
   *   { "type": "streak_days", "value": 7 }
   *   { "type": "daily_points", "value": 100 }
   *
   * Поле индексируется для быстрого поиска по типу условия.
   */
  @Column({ type: 'jsonb', nullable: false })
  condition: Record<string, any>;

  /**
   * Если true — достижение скрыто до выполнения (не видно в списке до получения).
   */
  @Column({ type: 'boolean', default: false })
  is_hidden: boolean;

  /**
   * Время создания записи.
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /**
   * Последнее обновление шаблона (например, админ поменял описание).
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
