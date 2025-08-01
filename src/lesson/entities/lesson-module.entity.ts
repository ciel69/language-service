import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { LessonModuleProgress } from '@/progress/entities/lesson-module-progress.entity';
import { LearningSection } from '@/learning/entities/learning-section.entity'; // Убедитесь, что путь правильный

/**
 * Модуль урока (Точка на карте).
 * Представляет собой логически завершенную единицу обучения,
 * требующую прохождения нескольких отдельных уроков (Lesson).
 */
@Entity()
@Index(['learningSectionId']) // Индекс для фильтрации по разделу
@Index(['order']) // Индекс для сортировки внутри раздела
export class LessonModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /**
   * (Опционально) Краткое описание модуля.
   * Используется, например, для отображения внутри раздела или на карте.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  shortDescription: string | null;

  /**
   * Порядковый номер модуля внутри его раздела (LearningSection).
   */
  @Column({ type: 'int', default: 0 })
  order: number;

  /**
   * (Опционально) URL или путь к иконке/иллюстрации модуля.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl: string | null;

  /**
   * Дата создания записи.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Дата последнего обновления записи.
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // --- Связи ---
  /**
   * Раздел обучения, к которому принадлежит этот модуль.
   * Связь Many-to-One.
   */
  @ManyToOne(() => LearningSection, (section) => section.modules, {
    onDelete: 'CASCADE', // При удалении раздела удаляются модули
    eager: false, // Не загружать раздел по умолчанию
  })
  @JoinColumn({ name: 'learningSectionId' })
  learningSection: LearningSection;

  @Column()
  learningSectionId: number;

  /**
   * Уроки, составляющие этот модуль.
   * Связь One-to-Many.
   */
  @OneToMany(() => Lesson, (lesson) => lesson.module)
  lessons: Lesson[];

  /**
   * Записи прогресса пользователей по данному модулю.
   * Это прогресс "точки на карте".
   */
  @OneToMany(() => LessonModuleProgress, (progress) => progress.module)
  progress: LessonModuleProgress[];
}
