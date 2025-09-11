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
import { KanaService } from './kana.service';
import { CreateKanaDto } from './dto/create-kana.dto';
import { UpdateKanaDto } from './dto/update-kana.dto';
import { AuthGuard, Public } from 'nest-keycloak-connect';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';
import { AuthService } from '@/modules/auth/auth.service';
import { Request } from 'express';
import { SrsExerciseResultDto, SrsService } from '@/services/srs.service';
import { KanaLessonGeneratorService } from '@/modules/lesson/services/kana-lesson-generator.service';

@Controller('kana')
export class KanaController {
  constructor(
    private readonly kanaService: KanaService,
    private readonly authService: AuthService,
    private readonly kanaLessonGeneratorService: KanaLessonGeneratorService,
    private readonly srsService: SrsService,
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
  // @UseGuards(AuthGuard)
  @Public()
  async findOne(
    @Param('id') id: string,
    @Param('type') typeKana: 'hiragana' | 'katakana',
  ) {
    const res = await this.kanaService.getLessonPlan(Number(id), typeKana);
    const config = {
      includeCombinations: true,
    };
    return this.kanaLessonGeneratorService.generateKanaLesson(
      res.symbols,
      [],
      config,
    );
  }

  @Post('lessons/complete/:id')
  async completeLesson(
    @Param('id') id: number,
    @Body('results') results: SrsExerciseResultDto[],
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Обновляем прогресс для каждого результата в зависимости от типа
      for (const result of results) {
        await this.kanaService.updateProgress(id, result);
      }

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
