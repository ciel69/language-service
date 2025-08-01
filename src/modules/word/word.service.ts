import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { Word } from '@/modules/word/entities/word.entity';

@Injectable()
export class WordService {
  constructor(
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {}

  create(createWordDto: CreateWordDto) {
    return 'This action adds a new word';
  }

  async findAll() {
    const data = await this.wordRepository.find({
      where: {
        progress: {
          userId: 2,
        },
      },
      relations: ['progress', 'kanji'],
    });
    console.log('data', data);
    return data;
  }

  findOne(id: number) {
    return this.wordRepository.find({
      where: {
        word: '一',
        progress: {
          userId: 1,
        },
      },
      relations: ['progress'],
    });
  }

  update(id: number, updateWordDto: UpdateWordDto) {
    return `This action updates a #${id} word`;
  }

  remove(id: number) {
    return `This action removes a #${id} word`;
  }
}
