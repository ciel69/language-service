import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';

import { User } from '@/modules/user/entities/user.entity';
import { Kana } from '@/modules/kana/entities/kana.entity';
import { KanaProgress } from '@/modules/progress/entities/kana-progress.entity';

import { CreateKanaProgressDto } from '@/modules/progress/dto/create-kana-progress.dto';
import { UpdateKanaProgressDto } from '@/modules/progress/dto/update-kana-progress.dto';

@Injectable()
export class KanaProgressService {
  constructor(
    @InjectRepository(KanaProgress)
    private readonly kanaProgressRepository: Repository<KanaProgress>,
  ) {}

  async create(
    createKanaProgressDto: CreateKanaProgressDto,
  ): Promise<KanaProgress> {
    const kanaProgress = this.kanaProgressRepository.create(
      createKanaProgressDto,
    );
    return await this.kanaProgressRepository.save(kanaProgress);
  }

  async findAll(
    options?: FindManyOptions<KanaProgress>,
  ): Promise<KanaProgress[]> {
    return await this.kanaProgressRepository.find(options);
  }

  async findHiragana(userId: number): Promise<KanaProgress[]> {
    return await this.kanaProgressRepository.find({
      where: {
        userId: userId,
      },
    });
  }

  async findOne(
    where: FindOptionsWhere<KanaProgress> | FindOptionsWhere<KanaProgress>[],
    options?: FindOneOptions<KanaProgress>,
  ): Promise<KanaProgress | null> {
    return await this.kanaProgressRepository.findOne({ where, ...options });
  }

  async findById(id: number): Promise<KanaProgress | null> {
    return await this.kanaProgressRepository.findOne({
      where: {
        id,
      },
    });
  }

  async findByUser(userId: number): Promise<KanaProgress[]> {
    return await this.kanaProgressRepository.find({ where: { userId } });
  }

  async findByUserAndKana(
    userId: number,
    kanaId: number,
  ): Promise<KanaProgress | null> {
    return await this.kanaProgressRepository.findOne({
      where: { userId, kanaId },
    });
  }

  async update(
    id: number,
    updateKanaProgressDto: UpdateKanaProgressDto,
  ): Promise<KanaProgress> {
    // Сначала находим запись
    const kanaProgress = await this.kanaProgressRepository.findOne({
      where: { id },
    });
    if (!kanaProgress) {
      throw new Error(`KanaProgress with ID ${id} not found`);
    }

    // Объединяем существующую сущность с обновленными данными
    Object.assign(kanaProgress, updateKanaProgressDto);
    return await this.kanaProgressRepository.save(kanaProgress);
  }

  async remove(id: number): Promise<void> {
    const result = await this.kanaProgressRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`KanaProgress with ID ${id} not found`);
    }
  }

  /**
   * Обновляет или создает прогресс для конкретного пользователя и символа.
   * @param user Пользователь
   * @param kana Символ каны
   * @param updateData Данные для обновления
   * @returns Обновленная или созданная сущность KanaProgress
   */
  async upsertForUserAndKana(
    user: User,
    kana: Kana,
    updateData: Partial<KanaProgress>,
  ): Promise<KanaProgress> {
    let progress = await this.findByUserAndKana(user.id, kana.id);
    if (!progress) {
      progress = this.kanaProgressRepository.create({
        user,
        kana,
        ...updateData,
      });
    } else {
      Object.assign(progress, updateData);
    }
    return await this.kanaProgressRepository.save(progress);
  }
}
