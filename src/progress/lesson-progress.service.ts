import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';

import { User } from '@/user/entities/user.entity';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { LessonProgress } from '@/progress/entities/lesson-progress.entity';

import { CreateProgressDto } from '@/progress/dto/create-progress.dto';
import { UpdateProgressDto } from '@/progress/dto/update-progress.dto';

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
  ) {}

  async create(
    createLessonProgressDto: CreateProgressDto,
  ): Promise<LessonProgress> {
    const lessonProgress = this.lessonProgressRepository.create(
      createLessonProgressDto,
    );
    return await this.lessonProgressRepository.save(lessonProgress);
  }

  async findAll(
    options?: FindManyOptions<LessonProgress>,
  ): Promise<LessonProgress[]> {
    return await this.lessonProgressRepository.find(options);
  }

  async findOne(
    where:
      | FindOptionsWhere<LessonProgress>
      | FindOptionsWhere<LessonProgress>[],
    options?: FindOneOptions<LessonProgress>,
  ): Promise<LessonProgress | null> {
    return await this.lessonProgressRepository.findOne({ where, ...options });
  }

  async findByUser(userId: number): Promise<LessonProgress[]> {
    return await this.lessonProgressRepository.find({ where: { userId } });
  }

  async findByUserAndLesson(
    userId: number,
    lessonId: number,
  ): Promise<LessonProgress | null> {
    return await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });
  }

  async update(
    id: number,
    updateLessonProgressDto: UpdateProgressDto,
  ): Promise<LessonProgress> {
    const lessonProgress = await this.lessonProgressRepository.findOne({
      where: { id },
    });
    if (!lessonProgress) {
      throw new Error(`LessonProgress with ID ${id} not found`);
    }
    Object.assign(lessonProgress, updateLessonProgressDto);
    return await this.lessonProgressRepository.save(lessonProgress);
  }

  async remove(id: number): Promise<void> {
    const result = await this.lessonProgressRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`LessonProgress with ID ${id} not found`);
    }
  }

  async upsertForUserAndLesson(
    user: User,
    lesson: Lesson,
    updateData: Partial<LessonProgress>,
  ): Promise<LessonProgress> {
    let progress = await this.findByUserAndLesson(user.id, lesson.id);
    if (!progress) {
      progress = this.lessonProgressRepository.create({
        user,
        lesson,
        ...updateData,
      });
    } else {
      Object.assign(progress, updateData);
    }
    return await this.lessonProgressRepository.save(progress);
  }
}
