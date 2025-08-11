import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST') && '',
        port: config.get('REDIS_PORT'),
        ttl: config.get('CACHE_TTL') || 86400, // 24 hours default
        auth_pass: config.get('REDIS_PASSWORD'),
        isGlobal: true,
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
