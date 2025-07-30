import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';

import { User } from '@/user/entities/user.entity';
import { Word } from '@/word/entities/word.entity';
import { WordProgress } from '@/progress/entities/word-progress.entity';

import { CreateWordProgressDto } from './dto/create-word-progress.dto';
import { UpdateWordProgressDto } from './dto/update-word-progress.dto';

@Injectable()
export class WordProgressService {
  constructor(
    @InjectRepository(WordProgress)
    private readonly wordProgressRepository: Repository<WordProgress>,
  ) {}

  async create(
    createWordProgressDto: CreateWordProgressDto,
  ): Promise<WordProgress> {
    const wordProgress = this.wordProgressRepository.create(
      createWordProgressDto,
    );
    return await this.wordProgressRepository.save(wordProgress);
  }

  async findAll(
    options?: FindManyOptions<WordProgress>,
  ): Promise<WordProgress[]> {
    return await this.wordProgressRepository.find(options);
  }

  async findOne(
    where: FindOptionsWhere<WordProgress> | FindOptionsWhere<WordProgress>[],
    options?: FindOneOptions<WordProgress>,
  ): Promise<WordProgress | null> {
    return await this.wordProgressRepository.findOne({ where, ...options });
  }

  async findByUser(userId: number): Promise<WordProgress[]> {
    return await this.wordProgressRepository.find({ where: { userId } });
  }

  async findByUserAndWord(
    userId: number,
    wordId: number,
  ): Promise<WordProgress | null> {
    return await this.wordProgressRepository.findOne({
      where: { userId, wordId },
    });
  }

  async update(
    id: number,
    updateWordProgressDto: UpdateWordProgressDto,
  ): Promise<WordProgress> {
    const wordProgress = await this.wordProgressRepository.findOne({
      where: { id },
    });
    if (!wordProgress) {
      throw new Error(`WordProgress with ID ${id} not found`);
    }
    Object.assign(wordProgress, updateWordProgressDto);
    return await this.wordProgressRepository.save(wordProgress);
  }

  async remove(id: number): Promise<void> {
    const result = await this.wordProgressRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`WordProgress with ID ${id} not found`);
    }
  }

  async upsertForUserAndWord(
    user: User,
    word: Word,
    updateData: Partial<WordProgress>,
  ): Promise<WordProgress> {
    let progress = await this.findByUserAndWord(user.id, word.id);
    if (!progress) {
      progress = this.wordProgressRepository.create({
        user,
        word,
        ...updateData,
      });
    } else {
      Object.assign(progress, updateData);
    }
    return await this.wordProgressRepository.save(progress);
  }
}
