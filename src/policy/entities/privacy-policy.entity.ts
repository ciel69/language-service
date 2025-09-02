// entities/privacy-policy.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserConsent } from './user-consent.entity';

@Entity('privacy_policies')
export class PrivacyPolicy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 10, unique: true })
  version: string; // например, "1.0", "1.1"

  @Column('text')
  content: string; // HTML или Markdown

  @Column({ default: false })
  isActive: boolean; // актуальна ли версия

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Связь: одна политика → много согласий
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @OneToMany(() => UserConsent, (consent) => consent.policy)
  consents: UserConsent[];
}
