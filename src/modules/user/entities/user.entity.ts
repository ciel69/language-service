import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
// --- УДАЛЕНЫ прямые импорты сущностей прогресса ---
// import { KanaProgress } from '@/progress/entities/kana-progress.entity';
// import { WordProgress } from '@/progress/entities/word-progress.entity';
// import { KanjiProgress } from '@/progress/entities/kanji-progress.entity';
// import { GrammarProgress } from '@/progress/entities/grammar-progress.entity';
// --- КОНЕЦ удаленных импортов ---

@Entity()
@Unique(['username'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  /**
   * Записи прогресса пользователя по изучению каны
   * Используем строковое имя сущности, чтобы избежать циклического импорта.
   */
  @OneToMany('KanaProgress', 'user') // 'KanaProgress' как строка, 'user' - имя свойства в KanaProgress
  kanaProgress: any[]; // Используем any[] или более общий тип, если точный тип важен, можно оставить комментарий

  @OneToMany('WordProgress', 'user')
  wordProgress: any[];

  @OneToMany('KanjiProgress', 'user')
  kanjiProgress: any[];

  @OneToMany('GrammarProgress', 'user')
  grammarProgress: any[];

  @OneToMany('LessonModuleProgress', 'user')
  lessonModuleProgress: any[];
}
