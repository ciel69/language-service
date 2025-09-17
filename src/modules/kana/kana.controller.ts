import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from 'nest-keycloak-connect';

import { KanaService } from './kana.service';
import { CreateKanaDto } from './dto/create-kana.dto';
import { UpdateKanaDto } from './dto/update-kana.dto';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';
import { AuthService } from '@/modules/auth/auth.service';
import { SrsExerciseResultDto } from '@/services/srs.service';
import { CurrencyAndStreakService } from '@/services/currency-and-streak.service';
import { LessonFactoryService } from '@/modules/lesson/factory/lesson-factory.service';
import { GeneratedKanaLesson } from '@/modules/lesson/services/lesson.types';

@Controller('kana')
export class KanaController {
  constructor(
    private readonly kanaService: KanaService,
    private readonly authService: AuthService,
    private readonly currencyAndStreakService: CurrencyAndStreakService,
    private readonly lessonFactoryService: LessonFactoryService,
  ) {}

  @Post()
  create(@Body() createKanaDto: CreateKanaDto) {
    return this.kanaService.create(createKanaDto);
  }

  @Get()
  findAll() {
    return this.kanaService.getLessonPlan(1, 'hiragana');
  }

  @Get('hiragana/all')
  @UseGuards(AuthGuard)
  async findHiragana(@Req() req: Request) {
    const user = await this.authService.syncUserWithDatabase(
      req.user as KeycloakJwtPayload,
    );
    return this.kanaService.findSymbols('hiragana', user.id);
  }

  @Get('katakana/all')
  @UseGuards(AuthGuard)
  async findKatakana(@Req() req: Request) {
    const user = await this.authService.syncUserWithDatabase(
      req.user as KeycloakJwtPayload,
    );
    return this.kanaService.findSymbols('katakana', user.id);
  }

  @Get('lesson/:type/:id')
  async findOne(
    @Param('id') id: string,
    @Param('type') typeKana: 'hiragana' | 'katakana',
  ) {
    const config = {
      includeCombinations: true,
    };
    const lesson =
      await this.lessonFactoryService.getLesson<GeneratedKanaLesson>('kana', {
        id,
        typeKana,
        config,
      });
    return lesson.data;
  }

  /**
   * Вычисляет награду на основе результатов и SRS-логики.
   * Замени эту заглушку на реальный вызов к SrsService.
   */
  private calculateRewardFromSrs(results: SrsExerciseResultDto[]): number {
    if (results.length === 0) return 0;

    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = correctCount / results.length;

    // 👇 ТВОЯ ЛОГИКА НАГРАДЫ — теперь основана на точности!
    if (accuracy >= 0.95) return 50; // почти идеально
    if (accuracy >= 0.8) return 30; // хорошо
    if (accuracy >= 0.6) return 10; // прошёл
    return 0; // неудача
  }

  @Post('lessons/complete/:id')
  async completeLesson(
    @Param('id') id: number,
    @Body('results') results: SrsExerciseResultDto[],
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const user = req.user as KeycloakJwtPayload;
    try {
      // Обновляем прогресс для каждого результата в зависимости от типа
      for (const result of results) {
        await this.kanaService.updateProgress(id, result);
      }

      // 🔥 НОВЫЙ ШАГ: Получаем награду через SRS-логику
      // Предположим, у тебя есть метод: SrsService.getRewardForItem(...)
      // Если нет — просто передай rewardAmount = 10 как заглушку
      const rewardAmount = this.calculateRewardFromSrs(results); // ← ТВОЯ ЛОГИКА!

      // 🔥 ОДИН ВЫЗОВ — всё остальное делает сервис
      await this.currencyAndStreakService.markKanaLessonCompleted(
        id,
        rewardAmount,
      );

      await this.lessonFactoryService.completeLesson({
        userKeycloakId: String(user.sub),
      });

      return {
        success: true,
        message: 'Прогресс успешно обновлен',
      };
    } catch (error) {
      console.error('Error completing lesson:', error);
      throw error;
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKanaDto: UpdateKanaDto) {
    return this.kanaService.update(+id, updateKanaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kanaService.remove(+id);
  }
}
