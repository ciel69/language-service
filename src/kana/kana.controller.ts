import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { KanaService } from './kana.service';
import { CreateKanaDto } from './dto/create-kana.dto';
import { UpdateKanaDto } from './dto/update-kana.dto';

@Controller('kana')
export class KanaController {
  constructor(private readonly kanaService: KanaService) {}

  @Post()
  create(@Body() createKanaDto: CreateKanaDto) {
    return this.kanaService.create(createKanaDto);
  }

  @Get()
  findAll() {
    return this.kanaService.findAll();
  }

  @Get('hiragana')
  findHiragana() {
    return this.kanaService.findHiragana();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kanaService.findOne(+id);
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
