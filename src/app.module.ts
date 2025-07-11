import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordModule } from './word/word.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'japanese_app',
      entities: [__dirname + '/**/*.entity{.ts,.js'],
      synchronize: true,
    }),
    WordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
