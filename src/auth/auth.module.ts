import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { User } from '@/modules/user/entities/user.entity';

import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { KeycloakModule } from '@/keycloak/keycloak.module';
import { KeycloakService } from '@/auth/keycloak.service';
import { OAuthValidationService } from '@/auth/oauth-validation.service';

import { PolicyService } from '@/policy/policy.service';
import { PolicyModule } from '@/policy/policy.module';
import { PrivacyPolicy } from '@/policy/entities/privacy-policy.entity';
import { UserConsent } from '@/policy/entities/user-consent.entity';

@Module({
  imports: [
    HttpModule,
    KeycloakModule,
    PolicyModule,
    ConfigModule,
    TypeOrmModule.forFeature([User, PrivacyPolicy, UserConsent]), // Правильный импорт репозитория
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
