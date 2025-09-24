// websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { promisify } from 'util';

interface UserSocket extends Socket {
  userId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Настройте согласно вашим требованиям безопасности
  },
})
@Injectable()
export class WebsocketGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private jwksClient: any;
  private logger = new Logger(WebsocketGateway.name);
  private userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds
  private testTimer: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {
    // Инициализация JWKS клиента для Keycloak
    this.jwksClient = jwksClient({
      jwksUri: `${this.configService.get<string>('KEYCLOAK_URL')}/realms/${this.configService.get<string>('KEYCLOAK_REALM')}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 минут
    });
  }

  private async getKey(header: any): Promise<string> {
    const key = await this.jwksClient.getSigningKey(header.kid);
    return key.getPublicKey();
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Отправляет уведомление о возможности использовать заморозку
   */
  async sendFreezeReminderToUser(userId: number, event: any): Promise<void> {
    this.logger.log(
      `Attempting to send freeze reminder to user ${userId} (type: ${typeof userId})`,
    );
    this.logger.log(
      `Current user sockets map keys:`,
      Array.from(this.userSockets.keys()),
    );

    // Преобразуем userId в число, если это строка
    const userIdNum =
      typeof userId === 'string' ? parseInt(userId, 10) : userId;

    if (this.userSockets.has(userIdNum)) {
      const socketIds = this.userSockets.get(userIdNum)!;
      this.logger.log(`Found ${socketIds.size} sockets for user ${userIdNum}`);

      socketIds.forEach((socketId) => {
        this.logger.log(`Sending freeze reminder to socket ${socketId}`);
        this.server.to(socketId).emit('freezeReminder', event);
      });

      this.logger.log(`Sent freeze reminder to user ${userIdNum}`);
    } else {
      this.logger.warn(`No sockets found for user ${userIdNum}`);
    }
  }

  /**
   * Отправляет уведомление о сбросе страйка
   */
  async sendStreakResetToUser(userId: number, event: any): Promise<void> {
    this.logger.log(
      `Attempting to send streak reset to user ${userId} (type: ${typeof userId})`,
    );
    this.logger.log(
      `Current user sockets map keys:`,
      Array.from(this.userSockets.keys()),
    );

    // Преобразуем userId в число, если это строка
    const userIdNum =
      typeof userId === 'string' ? parseInt(userId, 10) : userId;

    if (this.userSockets.has(userIdNum)) {
      const socketIds = this.userSockets.get(userIdNum)!;
      this.logger.log(`Found ${socketIds.size} sockets for user ${userIdNum}`);

      socketIds.forEach((socketId) => {
        this.logger.log(`Sending streak reset to socket ${socketId}`);
        this.server.to(socketId).emit('streakReset', event);
      });

      this.logger.log(`Sent streak reset to user ${userIdNum}`);
    } else {
      this.logger.warn(`No sockets found for user ${userIdNum}`);
    }
  }

  async handleConnection(client: UserSocket, ...args: any[]) {
    try {
      // Получаем userId из handshake query параметров
      const userIdStr = client.handshake.query.userId as string;
      this.logger.log(`Connection attempt with userId: ${userIdStr}`);

      if (userIdStr) {
        const userId = parseInt(userIdStr, 10);
        if (!isNaN(userId)) {
          client.userId = userId;

          // Добавляем сокет в маппинг пользователя (ключ как число)
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          this.userSockets.get(userId)!.add(client.id);

          this.logger.log(`User ${userId} connected with socket ${client.id}`);
          this.logger.log(
            `Current user sockets map:`,
            Array.from(this.userSockets.entries()),
          );
        } else {
          this.logger.warn(`Invalid userId format: ${userIdStr}`);
        }
      } else {
        this.logger.warn(
          `No userId provided in connection for socket ${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling connection', error);
    }
  }

  async handleDisconnect(client: UserSocket) {
    try {
      const userId = client.userId;
      this.logger.log(
        `Disconnect attempt for userId: ${userId}, socket: ${client.id}`,
      );

      if (userId && this.userSockets.has(userId)) {
        const userSockets = this.userSockets.get(userId)!;
        userSockets.delete(client.id);

        // Если у пользователя больше нет активных соединений, удаляем запись
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }

        this.logger.log(`User ${userId} disconnected socket ${client.id}`);
        this.logger.log(
          `Remaining user sockets:`,
          Array.from(this.userSockets.entries()),
        );
      } else {
        this.logger.log(
          `Anonymous disconnect or user not found for socket ${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling disconnection', error);
    }
  }

  /**
   * Отправляет событие страйка конкретному пользователю
   */
  async sendStreakUpdateToUser(userId: number, event: any): Promise<void> {
    this.logger.log(
      `Attempting to send streak update to user ${userId} (type: ${typeof userId})`,
    );
    this.logger.log(
      `Current user sockets map keys:`,
      Array.from(this.userSockets.keys()),
    );

    // Преобразуем userId в число, если это строка
    const userIdNum =
      typeof userId === 'string' ? parseInt(userId, 10) : userId;

    if (this.userSockets.has(userIdNum)) {
      const socketIds = this.userSockets.get(userIdNum)!;
      this.logger.log(`Found ${socketIds.size} sockets for user ${userIdNum}`);

      socketIds.forEach((socketId) => {
        this.logger.log(`Sending to socket ${socketId}`);
        this.server.to(socketId).emit('streak-update', event);
      });

      this.logger.log(
        `Sent streak update to user ${userIdNum}: ${event.streakDays} days`,
      );
    } else {
      this.logger.warn(`No sockets found for user ${userIdNum}`);
      // Проверяем также строковый ключ
      if (this.userSockets.has(userId)) {
        this.logger.log(`Found sockets with string key ${userId}`);
      }
    }
  }

  /**
   * Отправляет событие достижения конкретному пользователю
   */
  async sendAchievementEarnedToUser(userId: number, event: any): Promise<void> {
    this.logger.log(
      `Attempting to send achievement to user ${userId} (type: ${typeof userId})`,
    );
    this.logger.log(
      `Current user sockets map keys:`,
      Array.from(this.userSockets.keys()),
    );

    // Преобразуем userId в число, если это строка
    const userIdNum =
      typeof userId === 'string' ? parseInt(userId, 10) : userId;

    if (this.userSockets.has(userIdNum)) {
      const socketIds = this.userSockets.get(userIdNum)!;
      this.logger.log(`Found ${socketIds.size} sockets for user ${userIdNum}`);

      socketIds.forEach((socketId) => {
        this.logger.log(`Sending to socket ${socketId}`);
        this.server.to(socketId).emit('achievement-earned', event);
      });

      this.logger.log(
        `Sent achievement earned to user ${userIdNum}: ${event.achievement.title}`,
      );
    } else {
      this.logger.warn(`No sockets found for user ${userIdNum}`);
      // Проверяем также строковый ключ
      if (this.userSockets.has(userId)) {
        this.logger.log(`Found sockets with string key ${userId}`);
      }
    }
  }

  /**
   * Отправляет событие всем подключенным пользователям
   */
  async broadcastToAll(event: string, data: any): Promise<void> {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted event ${event} to all users`);
  }

  /**
   * Тестовая отправка достижений каждые 5 секунд
   */
  private startTestNotifications(): void {
    if (process.env.NODE_ENV === 'development') {
      this.logger.log('Starting test achievement notifications...');

      this.testTimer = setInterval(() => {
        const testAchievement = {
          id: 9,
          title: 'Первый урок',
          description: 'Вы прошли первый урок — поздравляем!',
          icon: 'rocket-launch',
          category: 'learning',
          points: 25,
          condition: {
            type: 'lesson_completed',
            value: 1,
          },
          theme: '#8B5CF6',
          is_hidden: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          is_seasonal: false,
          season_id: null,
          start_date: null,
          end_date: null,
        };

        this.server.emit('achievement-earned', {
          userId: 0,
          achievement: testAchievement,
          earnedAt: new Date(),
        });

        this.logger.log('Sent test achievement notification');
      }, 5000);
    }
  }

  /**
   * Останавливает тестовые уведомления
   */
  stopTestNotifications(): void {
    if (this.testTimer) {
      clearInterval(this.testTimer);
      this.testTimer = null;
      this.logger.log('Stopped test achievement notifications');
    }
  }

  onModuleDestroy() {
    this.logger.log('WebSocket Gateway destroying...');
    this.stopTestNotifications();
  }

  /**
   * Метод для установки userId при аутентификации (вызывается из клиента)
   */
  @SubscribeMessage('authenticate')
  async handleAuthentication(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: UserSocket,
  ): Promise<void> {
    const userId = data.userId;
    this.logger.log(`Authentication attempt for userId: ${userId}`);

    if (userId) {
      client.userId = userId;

      // Добавляем сокет в маппинг пользователя
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      client.emit('authenticated', { success: true, userId });
      this.logger.log(`User ${userId} authenticated with socket ${client.id}`);
      this.logger.log(
        `Current user sockets map:`,
        Array.from(this.userSockets.entries()),
      );
    } else {
      client.emit('authenticated', { success: false, error: 'Invalid userId' });
    }
  }
}
