import { Injectable, Logger } from '@nestjs/common';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeycloakService {
  private kcAdminClient: KcAdminClient;
  private readonly logger = new Logger(KeycloakService.name);

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: process.env.KEYCLOAK_URL,
      realmName: process.env.KEYCLOAK_REALM,
    });
  }

  private generateSecurePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async authenticateAdmin() {
    await this.kcAdminClient.auth({
      grantType: 'client_credentials',
      clientId: String(process.env.KEYCLOAK_CLIENT_ID),
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    });
  }

  async handleTelegramAuth(
    telegramId: string,
    name: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
    jwtPayload: KeycloakJwtPayload;
  }> {
    try {
      await this.authenticateAdmin();

      // Создаем или получаем пользователя
      const result = await this.createUserInRealm(
        String(process.env.KEYCLOAK_REALM),
        { id: telegramId, name },
      );

      const realm = String(process.env.KEYCLOAK_REALM);

      // Сгенерировать пароль для пользователя
      const password = this.generateSecurePassword();

      // Присвоить пароль в Keycloak
      await this.kcAdminClient.users.resetPassword({
        id: result.user.id,
        credential: {
          temporary: false,
          type: 'password',
          value: password,
        },
      });

      this.logger.log('Password:', password);

      // Получаем user access_token / refresh_token
      const tokens = await this.getUserAccessToken(
        realm,
        result.user.username,
        password,
      );

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: result.user,
        jwtPayload: result.jwtPayload,
      };
    } catch (error) {
      this.logger.error('Telegram auth error:', error.message);
      throw new Error(`Telegram auth failed: ${error.message}`);
    }
  }

  private async getUserAccessToken(
    realm: string,
    username: string,
    password: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    id_token?: string;
  }> {
    const baseUrl = String(process.env.KEYCLOAK_URL).replace(/\/$/, '');
    const tokenUrl = `${baseUrl}/realms/${encodeURIComponent(
      realm,
    )}/protocol/openid-connect/token`;

    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('client_id', String(process.env.KEYCLOAK_WEB_CLIENT_ID)); // <-- nuxt-web
    formData.append('username', username);
    formData.append('password', password);

    // Для OIDC профиля (чтобы пришёл id_token)
    formData.append('scope', 'openid profile email');

    try {
      const response = await lastValueFrom(
        this.httpService.post(tokenUrl, formData.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'getUserAccessToken error:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  private async createUserInRealm(
    realm: string,
    user: { id: string; name: string },
  ): Promise<{
    user: any;
    jwtPayload: KeycloakJwtPayload;
  }> {
    const currentRealm = this.kcAdminClient.realmName;
    this.kcAdminClient.setConfig({
      realmName: realm,
    });

    try {
      const existingUsers = await this.kcAdminClient.users.find({
        email: `${user.id}@telegram.local`,
      });

      let createdUser;
      let userId;

      if (existingUsers.length > 0) {
        createdUser = existingUsers[0];
        userId = createdUser.id;
      } else {
        // Создаем пользователя БЕЗ пароля - только для идентификации
        const userResponse = await this.kcAdminClient.users.create({
          username: user.name,
          firstName: user.name.split(' ')[0],
          lastName: user.name.split(' ')[1] || '',
          email: `${user.id}@telegram.local`,
          enabled: true,
          emailVerified: true,
          // НЕ создаем credentials - пользователь не будет авторизовываться напрямую
          attributes: {
            telegramId: user.id,
          },
        });

        userId = userResponse.id;
        createdUser = await this.kcAdminClient.users.findOne({
          id: userId,
        });
      }

      // Добавляем Telegram federated identity
      await this.addTelegramFederatedIdentity(userId, user.id, realm);

      this.kcAdminClient.setConfig({
        realmName: currentRealm,
      });

      return {
        user: createdUser,
        jwtPayload: this.createUserJwtPayload(createdUser, realm),
      };
    } catch (error) {
      this.kcAdminClient.setConfig({
        realmName: currentRealm,
      });
      throw error;
    }
  }

  // Метод для получения токена клиента (для API доступа)
  private async getClientAccessToken(realm: string): Promise<string> {
    if (!process.env.KEYCLOAK_URL) {
      throw new Error('KEYCLOAK_URL must be set');
    }

    if (!process.env.KEYCLOAK_CLIENT_ID) {
      throw new Error('KEYCLOAK_CLIENT_ID must be set');
    }

    const baseUrl = process.env.KEYCLOAK_URL.replace(/\/$/, '');
    const tokenUrl = `${baseUrl}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;

    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', process.env.KEYCLOAK_CLIENT_ID);

      if (process.env.KEYCLOAK_CLIENT_SECRET) {
        formData.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);
      }

      const response = await lastValueFrom(
        this.httpService.post(tokenUrl, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      if (response.data?.access_token) {
        return response.data.access_token;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      this.logger.error('Client token request error:', {
        url: tokenUrl,
        status: error.response?.status,
        error: error.response?.data,
        message: error.message,
      });

      if (error.response?.data?.error_description) {
        throw new Error(
          `Failed to get client access token: ${error.response.data.error_description}`,
        );
      } else if (error.response?.data?.error) {
        throw new Error(
          `Failed to get client access token: ${error.response.data.error}`,
        );
      }
      throw new Error(`Failed to get client access token: ${error.message}`);
    }
  }

  private createUserJwtPayload(user: any, realm: string): KeycloakJwtPayload {
    const now = Math.floor(Date.now() / 1000);

    return {
      exp: now + 3600,
      iat: now,
      jti: `mock-jti-${Date.now()}`,
      iss: `${process.env.KEYCLOAK_URL}/realms/${realm}`,
      aud: process.env.KEYCLOAK_CLIENT_ID || 'account',
      sub: user.id,
      typ: 'Bearer',
      azp: process.env.KEYCLOAK_CLIENT_ID || 'account',
      preferred_username: user.username,
      email: user.email,
      email_verified: user.emailVerified || false,
      name:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.username,
      given_name: user.firstName,
      family_name: user.lastName,
      picture: user.attributes?.picture || undefined,
      realm_access: {
        roles: [
          'default-roles-' + realm.toLowerCase(),
          'offline_access',
          'uma_authorization',
        ],
      },
      resource_access: {
        [process.env.KEYCLOAK_CLIENT_ID || 'account']: {
          roles: ['view-profile', 'manage-account'],
        },
      },
      locale: user.attributes?.locale || 'en',
      updated_at: now,
      scope: 'openid profile email',
      session_state: `mock-session-${Date.now()}`,
    };
  }

  private async addTelegramFederatedIdentity(
    userId: string,
    telegramId: string,
    realm: string,
  ) {
    try {
      const currentRealm = this.kcAdminClient.realmName;
      this.kcAdminClient.setConfig({
        realmName: realm,
      });

      try {
        await this.kcAdminClient.users.addToFederatedIdentity({
          id: userId,
          federatedIdentityId: 'telegram',
          federatedIdentity: {
            identityProvider: 'telegram',
            userId: telegramId,
            userName: telegramId,
          },
        });
      } catch (apiError) {
        if (!apiError.message.includes('User is already linked')) {
          this.logger.warn(
            'Could not add Telegram federated identity:',
            apiError.message,
          );
        }
      }

      this.kcAdminClient.setConfig({
        realmName: currentRealm,
      });
    } catch (error) {
      this.logger.warn('Error in addTelegramFederatedIdentity:', error.message);
      this.kcAdminClient.setConfig({
        realmName: this.kcAdminClient.realmName,
      });
    }
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    const realm = this.configService.get<string>('KEYCLOAK_REALM');
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'KEYCLOAK_CLIENT_SECRET',
    );
    const baseUrl = this.configService.get<string>('KEYCLOAK_URL');

    const params = new URLSearchParams();
    params.append('client_id', String(clientId));
    params.append('client_secret', String(clientSecret));

    if (refreshToken) {
      params.append('refresh_token', refreshToken);
    } else {
      params.append('token', accessToken);
    }

    try {
      await this.httpService
        .post(
          `${baseUrl}/realms/${realm}/protocol/openid-connect/logout`,
          params,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
        .toPromise();
    } catch (error) {
      this.logger.error(
        'Keycloak logout error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to logout from Keycloak');
    }
  }
}
