import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';

import { User } from '@/user/entities/user.entity';
import { Kanji } from '@/kanji/entities/kanji.entity';
import { KanjiProgress } from '@/progress/entities/kanji-progress.entity';

import { CreateProgressDto } from '@/progress/dto/create-progress.dto';
import { UpdateProgressDto } from '@/progress/dto/update-progress.dto';

@Injectable()
export class KanjiProgressService {
  constructor(
    @InjectRepository(KanjiProgress)
    private readonly kanjiProgressRepository: Repository<KanjiProgress>,
  ) {}

  async create(
    createKanjiProgressDto: CreateProgressDto,
  ): Promise<KanjiProgress> {
    const kanjiProgress = this.kanjiProgressRepository.create(
      createKanjiProgressDto,
    );
    return await this.kanjiProgressRepository.save(kanjiProgress);
  }

  async findAll(
    options?: FindManyOptions<KanjiProgress>,
  ): Promise<KanjiProgress[]> {
    return await this.kanjiProgressRepository.find(options);
  }

  async findOne(
    where: FindOptionsWhere<KanjiProgress> | FindOptionsWhere<KanjiProgress>[],
    options?: FindOneOptions<KanjiProgress>,
  ): Promise<KanjiProgress | null> {
    return await this.kanjiProgressRepository.findOne({ where, ...options });
  }

  async findByUser(userId: number): Promise<KanjiProgress[]> {
    return await this.kanjiProgressRepository.find({ where: { userId } });
  }

  async findByUserAndKanji(
    userId: number,
    kanjiId: number,
  ): Promise<KanjiProgress | null> {
    return await this.kanjiProgressRepository.findOne({
      where: { userId, kanjiId },
    });
  }

  async update(
    id: number,
    updateKanjiProgressDto: UpdateProgressDto,
  ): Promise<KanjiProgress> {
    const kanjiProgress = await this.kanjiProgressRepository.findOne({
      where: { id },
    });
    if (!kanjiProgress) {
      throw new Error(`KanjiProgress with ID ${id} not found`);
    }
    Object.assign(kanjiProgress, updateKanjiProgressDto);
    return await this.kanjiProgressRepository.save(kanjiProgress);
  }

  async remove(id: number): Promise<void> {
    const result = await this.kanjiProgressRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`KanjiProgress with ID ${id} not found`);
    }
  }

  async upsertForUserAndKanji(
    user: User,
    kanji: Kanji,
    updateData: Partial<KanjiProgress>,
  ): Promise<KanjiProgress> {
    let progress = await this.findByUserAndKanji(user.id, kanji.id);
    if (!progress) {
      progress = this.kanjiProgressRepository.create({
        user,
        kanji,
        ...updateData,
      });
    } else {
      Object.assign(progress, updateData);
    }
    return await this.kanjiProgressRepository.save(progress);
  }
}
