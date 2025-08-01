// src/grammar/entities/grammar.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from 'typeorm';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { Word } from '@/word/entities/word.entity';
import { GrammarProgress } from '@/progress/entities/grammar-progress.entity';

// Опционально: enum для классификации типов грамматики (не типов упражнений!)
export enum GrammarRuleType {
  Particle = 'particle',
  Conditional = 'conditional',
  TeForm = 'te-form',
  Potential = 'potential',
  // ... другие типы правил
}

@Entity()
@Index(['jlptLevel']) // Индекс для уровня JLPT
// @Index(['type']) // Можно оставить, если используется для классификации правил
export class Grammar {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Пример предложения, демонстрирующее грамматическое правило.
   * @example "彼は本を読んでいる。"
   */
  @Column({ type: 'text' })
  sentence: string;

  /**
   * Подробное объяснение грамматического правила.
   * @example "Глагол в форме -ている обозначает действие, происходящее в данный момент..."
   */
  @Column({ type: 'text' })
  explanation: string;

  /**
   * Перевод примера предложения.
   * @example "Он читает книгу."
   */
  @Column({ type: 'text' })
  translation: string;

  // --- Опционально: Классификация типа правила (НЕ типа упражнения) ---
  /**
   * Тип грамматического правила (для организации и фильтрации).
   * @example 'particle' для частиц, 'conditional' для условных форм и т.д.
   */
  @Column({
    type: 'enum',
    enum: GrammarRuleType,
    nullable: true,
  })
  ruleType?: GrammarRuleType;
  // --- Конец опционального поля ---

  // --- Метаданные ---
  @Column({
    type: 'enum',
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    nullable: true,
  })
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  @Column({ type: 'int', default: 1 })
  difficulty: number; // 1-5
  // --- Конец метаданных ---

  // --- Связи ---
  /**
   * Уроки, в которых это грамматическое правило преподается или используется.
   */
  @ManyToMany(() => Lesson, (lesson) => lesson.grammar)
  @JoinTable()
  lessons: Lesson[];

  /**
   * Записи прогресса пользователей по изучению этого грамматического правила.
   */
  @OneToMany(() => GrammarProgress, (progress) => progress.grammar)
  progress: GrammarProgress[];

  /**
   * Слова, которые используют это грамматическое правило или связаны с ним.
   * (Зависит от вашей логики в Word.entity.ts)
   */
  @ManyToMany(() => Word, (word) => word.grammar) // Убедитесь, что связь корректна
  @JoinTable()
  words: Word[];
  // --- Конец связей ---
}
