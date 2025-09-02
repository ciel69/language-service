// src/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwks') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: process.env.KEYCLOAK_ISSUER,
      algorithms: ['RS256'],
      audience: process.env.KEYCLOAK_AUDIENCE,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
      }),
    });
    this.logger.log(
      'JwtStrategy initialized with JWKS URI:',
      `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
    );
  }

  async validate(payload: KeycloakJwtPayload) {
    this.logger.log(`Validating user with keycloakId: ${payload.sub}`);

    // Проверяем обязательные поля
    if (!payload.sub) {
      this.logger.error('Invalid payload: missing sub field');
      return null;
    }

    // payload.sub — это UUID юзера в Keycloak
    let user = await this.usersRepo.findOne({
      where: { keycloakId: payload.sub },
    });

    if (!user) {
      this.logger.log(`Creating new user for keycloakId: ${payload.sub}`);
      user = await this.usersRepo.save({
        keycloakId: payload.sub,
        username: payload.preferred_username || payload.email || payload.sub,
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        level: 'N5',
      });
    }

    return user;
  }
}
