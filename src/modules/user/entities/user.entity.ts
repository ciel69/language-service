import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
  Index,
  OneToOne,
  JoinTable,
  ManyToMany,
} from 'typeorm';

import { UserStat } from '@/achievements/entities/user-stat.entity';
import { Achievement } from '@/achievements/entities/achievement.entity';

@Entity()
@Unique(['username'])
@Index(['keycloakId'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  keycloakId: string; // UUID пользователя из Keycloak

  @Column()
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 'N5' })
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  /**
   * Записи прогресса пользователя по изучению каны
   * Используем строковое имя сущности, чтобы избежать циклического импорта.
   */
  @OneToMany('KanaProgress', 'user')
  kanaProgress: any[];

  @OneToMany('WordProgress', 'user')
  wordProgress: any[];

  @OneToMany('KanjiProgress', 'user')
  kanjiProgress: any[];

  @OneToMany('GrammarProgress', 'user')
  grammarProgress: any[];

  @OneToMany('LessonModuleProgress', 'user')
  lessonModuleProgress: any[];

  @OneToMany('UserConsent', 'user')
  consents: any[];

  @ManyToMany(() => Achievement, { cascade: false })
  @JoinTable({
    name: 'user_achievement',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'achievement_id',
      referencedColumnName: 'id',
    },
  })
  achievements: Achievement[];

  @OneToOne(() => UserStat, (stat) => stat.user, {
    cascade: ['insert', 'update'],
    orphanedRowAction: 'delete',
  })
  stat: UserStat;
}
