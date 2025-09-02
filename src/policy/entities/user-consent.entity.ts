import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PrivacyPolicy } from './privacy-policy.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  // Связь с пользователем
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @ManyToOne(() => User, (user) => user.consents)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Связь с политикой

  @ManyToOne(() => PrivacyPolicy, (policy) => policy.consents)
  @JoinColumn({ name: 'policy_id' })
  policy: PrivacyPolicy;

  @Column({ name: 'ip_hash', nullable: true })
  ipHash: string; // опционально: хеш IP-адреса

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;
}
