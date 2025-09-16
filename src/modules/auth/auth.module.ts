import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { User } from '@/modules/user/entities/user.entity';

import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { KeycloakModule } from '@/modules/keycloak/keycloak.module';
import { KeycloakService } from '@/modules/auth/keycloak.service';
import { OAuthValidationService } from '@/modules/auth/oauth-validation.service';

import { PolicyService } from '@/modules/policy/policy.service';
import { PolicyModule } from '@/modules/policy/policy.module';
import { PrivacyPolicy } from '@/modules/policy/entities/privacy-policy.entity';
import { UserConsent } from '@/modules/policy/entities/user-consent.entity';
import { RedisCacheModule } from '@/redis-cache.module';
import { UserModule } from '@/modules/user/user.module';
import { AchievementsModule } from '@/achievements/achievements.module';
import { UserStat } from '@/achievements/entities/user-stat.entity';

@Module({
  imports: [
    HttpModule,
    KeycloakModule,
    PolicyModule,
    ConfigModule,
    RedisCacheModule,
    UserModule,
    AchievementsModule,
    TypeOrmModule.forFeature([User, PrivacyPolicy, UserConsent, UserStat]), // Правильный импорт репозитория
    PassportModule.register({ defaultStrategy: 'jwks' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    KeycloakService,
    OAuthValidationService,
    PolicyService,
  ],
  exports: [KeycloakModule, AuthService],
})
export class AuthModule {}
