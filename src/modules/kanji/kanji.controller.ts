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
} from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { CreateKanjiDto } from './dto/create-kanji.dto';
import { UpdateKanjiDto } from './dto/update-kanji.dto';
import { Public } from 'nest-keycloak-connect';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiDetailDto, KanjiWithProgressDto } from '@/modules/kanji/dto';

@Controller('kanji')
export class KanjiController {
  constructor(private readonly kanjiService: KanjiService) {}

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
}
