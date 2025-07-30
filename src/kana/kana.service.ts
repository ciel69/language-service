import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateKanaDto } from './dto/create-kana.dto';
import { UpdateKanaDto } from './dto/update-kana.dto';
import { Kana } from '@/kana/entities/kana.entity';

@Injectable()
export class KanaService {
  constructor(
    @InjectRepository(Kana)
    private readonly kanaRepository: Repository<Kana>,
  ) {}

  create(createKanaDto: CreateKanaDto) {
    return 'This action adds a new kana';
  }

  findAll() {
    return `This action returns all kana`;
  }

  async findHiragana() {
    return await this.kanaRepository.find({
      where: {
        type: 'hiragana',
        complexity: 'simple',
        progress: {
          userId: 7,
        },
      },
      relations: ['progress'],
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} kana`;
  }

  update(id: number, updateKanaDto: UpdateKanaDto) {
    return `This action updates a #${id} kana`;
  }

  remove(id: number) {
    return `This action removes a #${id} kana`;
  }
}
