import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  ParseIntPipe,
  Query,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { CreateKanjiDto } from './dto/create-kanji.dto';
import { UpdateKanjiDto } from './dto/update-kanji.dto';
import { Public } from 'nest-keycloak-connect';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiDetailDto, KanjiWithProgressDto } from '@/modules/kanji/dto';
import { KanjiLessonGeneratorService } from '@/modules/lesson/services/kanji/kanji-lesson-generator.service';
import { SrsExerciseResultDto } from '@/services/srs.service';
import { LessonFactoryService } from '@/modules/lesson/factory/lesson-factory.service';
import { GeneratedKanjiLesson } from '@/modules/kanji/interfaces';
import { Request } from 'express';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';
import { CurrencyAndStreakService } from '@/services/currency-and-streak.service';

@Controller('kanji')
export class KanjiController {
  constructor(
    private readonly kanjiService: KanjiService,
    private readonly lessonFactoryService: LessonFactoryService,
    private readonly currencyAndStreakService: CurrencyAndStreakService,
  ) {}

  @Post('lessons/complete/:userId/:packId')
  async completeLesson(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('packId', ParseIntPipe) packId: number,
    @Body('results') results: SrsExerciseResultDto[],
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const user = req.user as KeycloakJwtPayload;
    try {
      // Обновляем прогресс для каждого результата
      for (const result of results) {
        await this.kanjiService.updateProgress(userId, result);
      }

      // Обновляем прогресс пака один раз
      await this.kanjiService.updatePackProgress(userId, packId);

      await this.currencyAndStreakService.markLessonCompleted(
        userId,
        10, // todo в будущем разработать метод по расчёту начисления валюты
        15,
        'kanji',
      );

      await this.lessonFactoryService.completeLesson({
        userKeycloakId: String(user.sub),
      });

      return {
        success: true,
        message: 'Прогресс успешно обновлен',
      };
    } catch (error) {
      console.error('Error completing kanji lesson:', error);
      throw error;
    }
  }

  // Получить детальную информацию о кандзи
  @Get(':id')
  @Public()
  async getKanjiDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ): Promise<KanjiDetailDto> {
    const result = await this.kanjiService.getKanjiDetail(id, userId);
    if (!result) {
      throw new NotFoundException(`Kanji with ID ${id} not found`);
    }
    return result;
  }

  @Get('packs/:level')
  @Public()
  async getPacksByLevel(
    @Param('level') level: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(level)) {
      throw new BadRequestException('Invalid JLPT level');
    }
    return this.kanjiService.getPacksWithProgress(level, userId);
  }

  // Получить список всех кандзи в паке с прогрессом пользователя
  @Get('pack/:id')
  @Public()
  async getKanjiByPackId(
    @Param('id', ParseIntPipe) packId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<KanjiWithProgressDto[]> {
    return this.kanjiService.getKanjiByPackIdWithProgress(packId, userId);
  }

  // Получить случайные кандзи из пака с прогрессом пользователя
  @Get('pack/:id/random')
  @Public()
  async getRandomKanjiFromPack(
    @Param('id', ParseIntPipe) packId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 5,
  ): Promise<KanjiWithProgressDto[]> {
    if (limit < 1 || limit > 20) {
      throw new BadRequestException('Limit must be between 1 and 20');
    }
    return this.kanjiService.getRandomKanjiFromPackWithProgress(
      packId,
      userId,
      limit,
    );
  }

  @Post()
  create(@Body() createKanjiDto: CreateKanjiDto) {
    return this.kanjiService.create(createKanjiDto);
  }

  @Get()
  findAll() {
    return this.kanjiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kanjiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKanjiDto: UpdateKanjiDto) {
    return this.kanjiService.update(+id, updateKanjiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kanjiService.remove(+id);
  }

  @Get('pack/:packId/:userId')
  @Public()
  async generateLessonFromPack(
    @Param('packId', ParseIntPipe) packId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const config = {
      includeWritingTasks: true,
      includeAudioTasks: true,
      includeMeaningTasks: true,
      includeReadingTasks: true,
      includeCompoundsTasks: true,
      includeStrokeOrderTasks: true,
    };
    const lesson =
      await this.lessonFactoryService.getLesson<GeneratedKanjiLesson>('kanji', {
        packId,
        userId,
        config,
      });
    return lesson.data;
  }
}
