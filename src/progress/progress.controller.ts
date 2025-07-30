import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';

import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { KanaProgressService } from '@/progress/kana-progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressKanaService: KanaProgressService) {}

  @Post()
  create(@Body() createProgressDto: CreateProgressDto) {
    return this.progressKanaService.create(createProgressDto);
  }

  @Get()
  findAll() {
    return this.progressKanaService.findAll();
  }

  @Get('hiragana/:id')
  findHiragana(@Param('id') id: number) {
    console.log('findHiragana', id);
    return this.progressKanaService.findHiragana(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.progressKanaService.findById(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    return this.progressKanaService.update(+id, updateProgressDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.progressKanaService.remove(+id);
  }
}
