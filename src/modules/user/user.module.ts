import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '@/modules/user/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisCacheModule } from '@/redis-cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RedisCacheModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
