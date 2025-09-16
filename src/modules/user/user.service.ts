import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly USER_CACHE_PREFIX = 'user:keycloak:';
  private readonly USER_CACHE_TTL = 3600; // 1 час в секундах

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return this.userRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  /**
   * Получает пользователя по keycloakId с кэшированием
   * @param keycloakId UUID пользователя из Keycloak
   * @returns Promise<User | null> пользователь или null если не найден
   */
  async findByKeycloakId(keycloakId: string): Promise<User | null> {
    if (!keycloakId) {
      return null;
    }

    const cacheKey = `${this.USER_CACHE_PREFIX}${keycloakId}`;

    try {
      // Пытаемся получить из кэша
      const cachedUser = await this.cacheManager.get<User>(cacheKey);

      if (cachedUser) {
        this.logger.debug(
          `Пользователь с keycloakId ${keycloakId} найден в кэше`,
        );
        return cachedUser;
      }

      // Если нет в кэше — делаем JOIN запрос к БД
      const user = await this.userRepository.findOne({
        where: { keycloakId },
        relations: ['stat', 'achievements'], // 👈 Загружаем связи
        select: {
          id: true,
          username: true,
          keycloakId: true,
          email: true,
          level: true,
          // stat — будет подгружен через relations
          // achievements — тоже
        },
      });

      if (user) {
        // Сохраняем в кэш
        await this.cacheManager.set(cacheKey, user, this.USER_CACHE_TTL * 1000);
        this.logger.debug(
          `Пользователь с keycloakId ${keycloakId} закэширован`,
        );
      } else {
        this.logger.debug(
          `Пользователь с keycloakId ${keycloakId} не найден в БД`,
        );
      }

      return user || null;
    } catch (error) {
      this.logger.error(
        `Ошибка при поиске пользователя по keycloakId ${keycloakId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Ошибка при получении данных пользователя',
      );
    }
  }

  /**
   * Создает или обновляет пользователя и инвалидирует кэш
   * @param keycloakId UUID пользователя из Keycloak
   * @param userData Данные пользователя
   * @returns Promise<User> созданный или обновленный пользователь
   */
  async upsertUser(keycloakId: string, userData: Partial<User>): Promise<User> {
    try {
      // Ищем существующего пользователя
      let user = await this.userRepository.findOne({
        where: { keycloakId },
      });

      if (user) {
        // Обновляем существующего пользователя
        Object.assign(user, userData);
        user = await this.userRepository.save(user);
        this.logger.log(`Пользователь с keycloakId ${keycloakId} обновлен`);
      } else {
        // Создаем нового пользователя
        const newUser = this.userRepository.create({
          keycloakId,
          ...userData,
        });
        user = await this.userRepository.save(newUser);
        this.logger.log(`Пользователь с keycloakId ${keycloakId} создан`);
      }

      // Инвалидируем кэш
      const cacheKey = `${this.USER_CACHE_PREFIX}${keycloakId}`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Кэш для пользователя ${keycloakId} инвалидирован`);

      return user;
    } catch (error) {
      this.logger.error(
        `Ошибка при создании/обновлении пользователя с keycloakId ${keycloakId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Ошибка при сохранении данных пользователя',
      );
    }
  }

  /**
   * Инвалидирует кэш пользователя
   * @param keycloakId UUID пользователя из Keycloak
   */
  async invalidateUserCache(keycloakId: string): Promise<void> {
    try {
      const cacheKey = `${this.USER_CACHE_PREFIX}${keycloakId}`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Кэш для пользователя ${keycloakId} инвалидирован`);
    } catch (error) {
      this.logger.error(
        `Ошибка при инвалидации кэша пользователя ${keycloakId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Обновляет уровень пользователя и инвалидирует кэш
   * @param keycloakId UUID пользователя из Keycloak
   * @param level Новый уровень пользователя
   * @returns Promise<User> обновленный пользователь
   */
  async updateUserLevel(
    keycloakId: string,
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { keycloakId },
      });

      if (!user) {
        throw new NotFoundException(
          `Пользователь с keycloakId ${keycloakId} не найден`,
        );
      }

      user.level = level;
      const updatedUser = await this.userRepository.save(user);

      // Инвалидируем кэш
      await this.invalidateUserCache(keycloakId);

      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении уровня пользователя ${keycloakId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
