import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyController } from './policy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { PrivacyPolicy } from '@/policy/entities/privacy-policy.entity';
import { UserConsent } from '@/policy/entities/user-consent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PrivacyPolicy, UserConsent])],
  controllers: [PolicyController],
  providers: [PolicyService],
})
export class PolicyModule {}
