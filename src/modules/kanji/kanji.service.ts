import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateKanjiDto } from './dto/create-kanji.dto';
import { UpdateKanjiDto } from './dto/update-kanji.dto';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';

@Injectable()
export class KanjiService {
  constructor(
    @InjectRepository(Kanji)
    private readonly kanjiRepository: Repository<Kanji>,
  ) {}

  create(createKanjiDto: CreateKanjiDto) {
    return 'This action adds a new kanji';
  }

  findAll() {
    return `This action returns all kanji`;
  }

  findOne(id: number) {
    return `This action returns a #${id} kanji`;
  }

  update(id: number, updateKanjiDto: UpdateKanjiDto) {
    return `This action updates a #${id} kanji`;
  }

  remove(id: number) {
    return `This action removes a #${id} kanji`;
  }
}
