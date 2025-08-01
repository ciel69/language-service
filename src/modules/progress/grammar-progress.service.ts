import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';

import { User } from '@/modules/user/entities/user.entity';
import { Grammar } from '@/modules/grammar/entities/grammar.entity';
import { GrammarProgress } from '@/modules/progress/entities/grammar-progress.entity';

import { CreateProgressDto } from '@/modules/progress/dto/create-progress.dto';
import { UpdateProgressDto } from '@/modules/progress/dto/update-progress.dto';

@Injectable()
export class GrammarProgressService {
  constructor(
    @InjectRepository(GrammarProgress)
    private readonly grammarProgressRepository: Repository<GrammarProgress>,
  ) {}

  async create(
    createGrammarProgressDto: CreateProgressDto,
  ): Promise<GrammarProgress> {
    const grammarProgress = this.grammarProgressRepository.create(
      createGrammarProgressDto,
    );
    return await this.grammarProgressRepository.save(grammarProgress);
  }

  async findAll(
    options?: FindManyOptions<GrammarProgress>,
  ): Promise<GrammarProgress[]> {
    return await this.grammarProgressRepository.find(options);
  }

  async findOne(
    where:
      | FindOptionsWhere<GrammarProgress>
      | FindOptionsWhere<GrammarProgress>[],
    options?: FindOneOptions<GrammarProgress>,
  ): Promise<GrammarProgress | null> {
    return await this.grammarProgressRepository.findOne({ where, ...options });
  }

  async findByUser(userId: number): Promise<GrammarProgress[]> {
    return await this.grammarProgressRepository.find({ where: { userId } });
  }

  async findByUserAndGrammar(
    userId: number,
    grammarId: number,
  ): Promise<GrammarProgress | null> {
    return await this.grammarProgressRepository.findOne({
      where: { userId, grammarId },
    });
  }

  async update(
    id: number,
    updateGrammarProgressDto: UpdateProgressDto,
  ): Promise<GrammarProgress> {
    const grammarProgress = await this.grammarProgressRepository.findOne({
      where: { id },
    });
    if (!grammarProgress) {
      throw new Error(`GrammarProgress with ID ${id} not found`);
    }
    Object.assign(grammarProgress, updateGrammarProgressDto);
    return await this.grammarProgressRepository.save(grammarProgress);
  }

  async remove(id: number): Promise<void> {
    const result = await this.grammarProgressRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`GrammarProgress with ID ${id} not found`);
    }
  }

  async upsertForUserAndGrammar(
    user: User,
    grammar: Grammar,
    updateData: Partial<GrammarProgress>,
  ): Promise<GrammarProgress> {
    let progress = await this.findByUserAndGrammar(user.id, grammar.id);
    if (!progress) {
      progress = this.grammarProgressRepository.create({
        user,
        grammar,
        ...updateData,
      });
    } else {
      Object.assign(progress, updateData);
    }
    return await this.grammarProgressRepository.save(progress);
  }
}
