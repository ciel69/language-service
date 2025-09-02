import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  Delete,
  Param,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';

import { AuthGuard, Public, Resource, Scopes } from 'nest-keycloak-connect';

import { AuthService } from './auth.service';

import { Auth } from '@/modules/auth/dto/auth';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';
import { KeycloakService } from '@/modules/auth/keycloak.service';
import { OAuthValidationService } from '@/modules/auth/oauth-validation.service';

@Controller('auth')
@Resource(Auth.name)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
    private readonly keycloakService: KeycloakService,
    private readonly oauthValidationService: OAuthValidationService,
  ) {}

  @Post('token-login')
  @Scopes('Token-Login')
  @Public()
  async tokenLogin(
    @Body('token') token: string, // Keycloak access token
    @Res() res: Response,
  ) {
    try {
      console.log('Token login attempt with token length:', token?.length);

      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Token is required',
        });
      }

      // Получаем информацию о пользователе из Keycloak токена
      const keycloakUser = await this.authService.getUserInfoFromToken(token);

      if (!keycloakUser) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid Keycloak token',
        });
      }

      // Синхронизируем пользователя в вашей БД
      const user = await this.authService.syncUserWithDatabase(keycloakUser);

      return res.json({
        accessToken: token,
        user: {
          id: user.id,
          keycloakId: user.keycloakId,
          username: user.username,
          level: user.level,
        },
      });
    } catch (error) {
      console.error('Token login error:', error);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid or expired token',
      });
    }
  }

  @Post('telegram')
  @Scopes('Telegram')
  @Public()
  async handleTelegramAuth(
    @Body() body: { id: string; username: string; token: string },
    @Res() res: Response,
    @Req() request: Request,
  ) {
    try {
      const { id, username, token } = body;

      // Валидация Telegram токена
      const isValid =
        await this.oauthValidationService.validateTelegramWidgetData(body);

      if (!isValid) {
        throw new HttpException(
          'Invalid Telegram token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Вся логика внутри KeycloakService
      const result = await this.keycloakService.handleTelegramAuth(
        id,
        username,
      );

      // Синхронизируем пользователя в вашей БД
      const user = await this.authService.syncUserWithDatabase(
        result.jwtPayload,
        request,
      );

      return res.json({
        accessToken: result.accessToken,
        user,
      });
    } catch (error) {
      throw new HttpException(
        `Ошибка авторизации через Telegram: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('callback')
  @Public()
  @Scopes('Login')
  async callback(
    @Body()
    body: { code: string; redirectUri: string; codeVerifier: string },
    @Res() res: Response,
    @Req() request: Request,
  ) {
    try {
      const { code, redirectUri, codeVerifier } = body;

      console.log('Keycloak callback received with code');

      // Обмениваем код + PKCE на токены
      const tokens = await this.authService.exchangeCodeForToken(
        code,
        redirectUri,
        codeVerifier,
      );

      if (!tokens) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'token_exchange_failed',
          message: 'Failed to exchange authorization code for tokens',
        });
      }

      // Получаем информацию о пользователе из userinfo endpoint
      const keycloakUser = await this.authService.getUserInfoFromToken(
        tokens.access_token,
      );

      // Синхронизируем пользователя в вашей БД
      const user = await this.authService.syncUserWithDatabase(
        keycloakUser,
        request,
      );

      // НЕ генерируем свои токены - используем Keycloak токен напрямую
      console.log('Using Keycloak token for user:', user.id);

      // Возвращаем Keycloak токен в JSON формате
      return res.status(HttpStatus.OK).json({
        success: true,
        accessToken: tokens.access_token, // Используем оригинальный Keycloak токен
        refreshToken: tokens.refresh_token, // И Keycloak refresh token
        user: {
          id: user.id,
          keycloakId: user.keycloakId,
          username: user.username,
          level: user.level,
        },
      });
    } catch (error) {
      console.error('Keycloak callback error:', error);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'auth_failed',
        message: error.message || 'Authentication failed',
      });
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: Request,
    @Body('refreshToken') refreshToken: string,
    @Res() res: Response,
  ) {
    try {
      const accessToken =
        (req.user as any)?.accessToken ||
        req.headers['authorization']?.split(' ')[1];

      if (!accessToken && !refreshToken) {
        throw new BadRequestException(
          'Access token or refresh token is required',
        );
      }

      // Выполняем logout через Keycloak
      await this.keycloakService.logout(accessToken, refreshToken);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Successfully logged out',
      });
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw new InternalServerErrorException('Failed to logout from Keycloak');
    }
  }

  @Get('available-providers')
  @Public() // Доступен всем пользователям
  async getAvailableProviders() {
    try {
      const providers = await this.authService.getAvailableIdentityProviders();

      return {
        success: true,
        providers: providers,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch available providers',
      );
    }
  }

  // Получение списка провайдеров пользователя
  @Get('providers')
  @UseGuards(AuthGuard) // Используем Keycloak AuthGuard
  async getUserProviders(@Req() req: Request) {
    try {
      // Получаем информацию о пользователе из Keycloak
      const keycloakUser = req.user as KeycloakJwtPayload; // nest-keycloak-connect добавляет user в request

      // Получаем список провайдеров из Keycloak
      const providers = await this.authService.getUserIdentityProviders(
        keycloakUser.sub,
      );

      return {
        success: true,
        providers: providers,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch user providers');
    }
  }

  // Привязка нового провайдера
  @Post('providers/:providerId/link')
  @UseGuards(AuthGuard)
  async linkProvider(
    @Req() req: Request,
    @Param('providerId') providerId: string,
    @Body() body: { accessToken: string },
  ) {
    try {
      const keycloakUser = req.user as KeycloakJwtPayload;

      // Привязываем провайдер через Keycloak Admin API
      const result = await this.authService.linkIdentityProvider(
        keycloakUser.sub,
        providerId,
        body.accessToken,
      );

      return {
        success: true,
        message: 'Provider linked successfully',
        result: result,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to link provider');
    }
  }

  // Отвязка провайдера
  @Delete('providers/:providerId/unlink')
  @UseGuards(AuthGuard)
  async unlinkProvider(
    @Req() req: Request,
    @Param('providerId') providerId: string,
  ) {
    try {
      const keycloakUser = req.user as KeycloakJwtPayload;

      // Отвязываем провайдер через Keycloak Admin API
      const result = await this.authService.unlinkIdentityProvider(
        keycloakUser.sub,
        providerId,
      );

      return {
        success: true,
        message: 'Provider unlinked successfully',
        result: result,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to unlink provider',
      );
    }
  }

  @Get('me')
  @UseGuards(AuthGuard) // Используем вашу JwtStrategy
  async getProfile(@Req() req: Request) {
    // return req.user; // Возвращает пользователя из JwtStrategy.validate
    return await this.authService.syncUserWithDatabase(
      req.user as KeycloakJwtPayload,
    );
  }
}
