import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { JwtService } from '@nestjs/jwt';
import { lastValueFrom } from 'rxjs';
import { decode } from 'jsonwebtoken';
import { Request } from 'express';

import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';
import { User } from '@/modules/user/entities/user.entity';
import { PolicyService } from '@/modules/policy/policy.service';
import { UserConsent } from '@/modules/policy/entities/user-consent.entity';
import { getClientIp, hashIp } from '@/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserService } from '@/modules/user/user.service';
import { UserStat } from '@/achievements/entities/user-stat.entity';

export type Tokens = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
};

@Injectable()
export class AuthService {
  private keycloakUrl: string;
  private realm: string;
  private clientId: string;
  private clientSecret: string;

  private readonly logger = new Logger(AuthService.name);

  private keycloakAdmin: KeycloakAdminClient;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly privacyPolicyService: PolicyService,
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,

    @InjectRepository(UserStat)
    private readonly userStatRepository: Repository<UserStat>,

    private httpService: HttpService,
    private config: ConfigService,
    private userService: UserService,
  ) {
    this.keycloakUrl = String(this.config.get('KEYCLOAK_URL'));
    this.realm = String(this.config.get('KEYCLOAK_REALM'));
    this.clientId = String(this.config.get('KEYCLOAK_CLIENT_ID'));
    this.clientSecret = String(this.config.get('KEYCLOAK_CLIENT_SECRET'));

    this.keycloakAdmin = new KeycloakAdminClient({
      baseUrl: process.env.KEYCLOAK_URL,
      realmName: process.env.KEYCLOAK_REALM,
    });
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    try {
      const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
      const realm = process.env.KEYCLOAK_REALM || 'KanjiFlow';
      const clientId = 'nuxt-web'; // Убедитесь, что это правильный client ID

      const tokenEndpoint = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

      console.log('Exchanging code for tokens:', {
        tokenEndpoint,
        clientId,
        redirectUri,
        codeLength: code.length,
      });

      // Используем URLSearchParams для правильного форматирования
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId);
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      params.append('code_verifier', codeVerifier);

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      console.log('Token exchange response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange error:', errorText);
        throw new Error(
          `Token exchange failed: ${response.status} ${errorText}`,
        );
      }

      const tokens = (await response.json()) as {
        access_token: string;
        refresh_token: string;
      };
      console.log('Token exchange successful, tokens received');

      return tokens;
    } catch (error) {
      console.error('exchangeCodeForToken error:', error);
      throw new Error(`exchangeCodeForToken error: ${error}`);
    }
  }

  async getUserInfoFromToken(accessToken: string): Promise<KeycloakJwtPayload> {
    try {
      // Сначала пробуем декодировать токен
      const decoded = decode(accessToken, { complete: true });

      if (decoded && decoded.payload) {
        // Проверяем валидность токена через introspection
        const isValid = await this.introspectToken(accessToken);
        if (isValid) {
          return decoded.payload as KeycloakJwtPayload;
        }
      }

      throw new Error('Invalid or expired token');
    } catch (error) {
      this.logger.error('Token validation error:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  private async introspectToken(token: string): Promise<boolean> {
    try {
      const baseUrl = String(process.env.KEYCLOAK_URL).replace(/\/$/, '');
      const realm = process.env.KEYCLOAK_REALM;
      const introspectUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token/introspect`;

      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('client_id', String(process.env.KEYCLOAK_CLIENT_ID));
      formData.append(
        'client_secret',
        String(process.env.KEYCLOAK_CLIENT_SECRET),
      );

      const response = await lastValueFrom(
        this.httpService.post(introspectUrl, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      return response.data?.active === true;
    } catch (error) {
      this.logger.error('Token introspection failed:', error.message);
      return false;
    }
  }

  async syncUserWithDatabase(
    keycloakUser: KeycloakJwtPayload,
    request?: Request,
  ): Promise<User> {
    try {
      const cacheKey = `user:${keycloakUser.sub}`;

      // Пытаемся получить из кэша
      let user = await this.cacheManager.get<User | null>(cacheKey);
      // Ищем пользователя в вашей БД по keycloakId
      if (!user) {
        // Ищем в БД
        user = await this.userService.findByKeycloakId(keycloakUser.sub);

        if (!user) {
          // Создаем нового пользователя (как раньше)
          let ip = '::1';
          if (request) {
            ip = getClientIp(request);
          }
          const activePolicy =
            await this.privacyPolicyService.getActivePolicy();

          user = await this.userRepository.save({
            keycloakId: keycloakUser.sub,
            email: keycloakUser.email,
            username:
              keycloakUser.name ||
              keycloakUser.email?.split('@')[0] ||
              `user_${keycloakUser.sub.substring(0, 8)}`,
            level: 'N5',
            lastLoginAt: new Date(),
          });

          const stat = this.userStatRepository.create({
            userId: user.id,
            lessonsCompleted: 0,
            wordsLearned: 0,
            kanaMastered: 0,
            streakDays: 0,
            totalPoints: 0,
            dailyPoints: 0,
            lastActivity: new Date(),
          });

          await this.userStatRepository.save(stat);

          await this.consentRepository.save({
            user: user,
            policy: activePolicy,
            ipHash: hashIp(ip),
          });
        } else {
          // Обновляем время последнего входа (опционально)
          // user.lastLoginAt = new Date();
          // await this.userRepository.save(user);
          // 👇 ЭТО ВАЖНО: ДАЖЕ ЕСЛИ ПОЛЬЗОВАТЕЛЬ УЖЕ СУЩЕСТВУЕТ — ПРОВЕРЯЕМ user_stat
          const existingStat = await this.userStatRepository.findOne({
            where: { userId: user.id },
          });

          if (!existingStat) {
            // 👇 СОЗДАЁМ user_stat для существующего пользователя — БЕЗ ПЕРЕСОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ!
            console.log(
              `[INFO] Creating missing user_stat for user ${user.id} (keycloakId: ${keycloakUser.sub})`,
            );

            const stat = this.userStatRepository.create({
              userId: user.id,
              lessonsCompleted: 0,
              wordsLearned: 0,
              kanaMastered: 0,
              streakDays: 0,
              totalPoints: 0,
              dailyPoints: 0,
              lastActivity: new Date(),
            });

            await this.userStatRepository.save(stat);
          }
        }

        // Сохраняем в кэш на 15 минут
        await this.cacheManager.set(cacheKey, user, 15 * 60 * 1000);
      }

      return user;
    } catch (error) {
      console.error('User sync error:', error);
      throw new Error('Failed to sync user with database');
    }
  }

  // Метод для инвалидации кэша при обновлении данных пользователя
  async invalidateUserCache(userId: string) {
    const cacheKey = `user:${userId}`;
    await this.cacheManager.del(cacheKey);
  }

  async generateAppTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      keycloakId: user.keycloakId,
      username: user.username,
      provider: 'keycloak',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, keycloakId: user.keycloakId, timestamp: Date.now() },
      { expiresIn: '7d' },
    );

    await this.userRepository.save(user);

    return { accessToken, refreshToken };
  }

  // Получение списка identity providers пользователя
  async getUserIdentityProviders(keycloakUserId: string): Promise<any[]> {
    try {
      // Авторизация в Keycloak Admin API
      await this.keycloakAdmin.auth({
        grantType: 'client_credentials',
        clientId: String(process.env.KEYCLOAK_CLIENT_ID),
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      });

      // Получаем федеративные identity ссылки пользователя
      const federatedIdentities =
        await this.keycloakAdmin.users.listFederatedIdentities({
          id: keycloakUserId,
          realm: process.env.KEYCLOAK_REALM,
        });

      // Форматируем данные для фронта
      return federatedIdentities.map((identity) => ({
        id: identity.identityProvider,
        providerId: identity.identityProvider,
        providerName: this.getProviderName(String(identity.identityProvider)),
        userId: identity.userId,
        userName: identity.userName,
        linkedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to fetch user identity providers:', error);
      return [];
    }
  }
  // Привязка identity provider
  async linkIdentityProvider(
    keycloakUserId: string,
    providerId: string,
    accessToken: string,
  ): Promise<any> {
    try {
      // Авторизация в Keycloak Admin API
      await this.keycloakAdmin.auth({
        username: process.env.KEYCLOAK_ADMIN_USER,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli',
      });

      // Здесь должна быть логика привязки провайдера
      // В зависимости от типа провайдера может потребоваться разный подход

      // Для примера - добавляем федеративную идентичность
      await this.keycloakAdmin.users.addToFederatedIdentity({
        id: keycloakUserId,
        federatedIdentityId: providerId,
        realm: process.env.KEYCLOAK_REALM,
        federatedIdentity: {
          identityProvider: providerId,
          userId: keycloakUserId, // или реальный ID от провайдера
          userName: `user-${providerId}`, // или реальное имя от провайдера
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to link identity provider:', error);
      throw new Error('Failed to link provider');
    }
  }

  // Отвязка identity provider
  async unlinkIdentityProvider(
    keycloakUserId: string,
    providerId: string,
  ): Promise<any> {
    try {
      // Авторизация в Keycloak Admin API
      await this.keycloakAdmin.auth({
        username: process.env.KEYCLOAK_ADMIN_USER,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli',
      });

      // Удаляем федеративную идентичность
      await this.keycloakAdmin.users.delFromFederatedIdentity({
        id: keycloakUserId,
        federatedIdentityId: providerId,
        realm: process.env.KEYCLOAK_REALM,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to unlink identity provider:', error);
      throw new Error('Failed to unlink provider');
    }
  }

  // Получение читаемого имени провайдера
  private getProviderName(providerId: string): string {
    const providerNames: Record<string, string> = {
      google: 'Google',
      github: 'GitHub',
      facebook: 'Facebook',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      microsoft: 'Microsoft',
      stackoverflow: 'Stack Overflow',
    };

    return providerNames[providerId] || providerId;
  }

  // Получение информации о провайдерах из Keycloak
  async getAvailableIdentityProviders(): Promise<any[]> {
    try {
      // Авторизация в Keycloak Admin API
      await this.keycloakAdmin.auth({
        username: process.env.KEYCLOAK_ADMIN_USER,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli',
      });

      // Получаем список доступных identity providers
      const providers = await this.keycloakAdmin.identityProviders.find({
        realm: process.env.KEYCLOAK_REALM,
      });

      return providers.map((provider) => ({
        id: provider.alias,
        name: provider.displayName || provider.alias,
        enabled: provider.enabled,
        providerId: provider.providerId,
        linkable: String((provider as any).linkable),
      }));
    } catch (error) {
      console.error('Failed to fetch identity providers:', error);
      return [];
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', 'nuxt-web');
    // params.append('client_secret', 'your-client-secret'); // если confidential client
    const baseUrl = String(process.env.KEYCLOAK_URL).replace(/\/$/, '');
    const realm = process.env.KEYCLOAK_REALM;

    const response = await fetch(
      `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      },
    );

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }
}
