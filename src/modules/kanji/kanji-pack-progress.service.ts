// src/kanji/service/kanji-pack-progress.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiProgress } from '@/modules/progress/entities/kanji-progress.entity';

@Injectable()
export class KanjiPackProgressService {
  constructor(
    @InjectRepository(KanjiPackProgress)
    private kanjiPackProgressRepository: Repository<KanjiPackProgress>,

    @InjectRepository(Kanji)
    private kanjiRepository: Repository<Kanji>,

    @InjectRepository(KanjiProgress)
    private kanjiProgressRepository: Repository<KanjiProgress>,
  ) {}

  /**
   * Обновляет прогресс пака кандзи на основе прогресса отдельных кандзи
   * @param userId ID пользователя
   * @param packId ID пака кандзи
   */
  async updatePackProgress(
    userId: number,
    packId: number,
  ): Promise<KanjiPackProgress> {
    // Получаем все кандзи в паке
    const kanjiInPack = await this.kanjiRepository.find({
      where: { pack: { id: packId } },
      select: ['id'],
    });

    const kanjiIds = kanjiInPack.map((k) => k.id);

    if (kanjiIds.length === 0) {
      throw new Error(`Пак кандзи с ID ${packId} не содержит кандзи`);
    }

    // Получаем прогресс для всех кандзи пользователя
    const progressList = await this.kanjiProgressRepository
      .createQueryBuilder('progress')
      .select(['progress.kanjiId', 'progress.progress'])
      .where('progress.userId = :userId', { userId })
      .andWhere('progress.kanjiId IN (:...kanjiIds)', { kanjiIds })
      .getMany();

    // Создаем мап прогресса для быстрого поиска
    const progressMap = new Map<number, number>();
    progressList.forEach((progress) => {
      progressMap.set(progress.kanjiId, progress.progress);
    });

    // Суммируем прогресс всех кандзи
    let totalProgress = 0;
    kanjiIds.forEach((kanjiId) => {
      totalProgress += progressMap.get(kanjiId) || 0;
    });

    // Средний прогресс = сумма прогрессов / количество кандзи
    const averageProgress =
      kanjiIds.length > 0 ? Math.round(totalProgress / kanjiIds.length) : 0;
    const learnedCount = progressList.filter((p) => p.progress >= 90).length;
    const totalCount = kanjiIds.length;

    // Находим или создаем прогресс пака
    let packProgress = await this.kanjiPackProgressRepository.findOne({
      where: {
        userId: userId,
        packId: packId,
      },
    });

    if (!packProgress) {
      // Создаем новый прогресс для пака
      packProgress = this.kanjiPackProgressRepository.create({
        userId: userId,
        packId: packId,
        learnedCount: 0,
        totalCount,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Обновляем прогресс
    packProgress.learnedCount = learnedCount;
    packProgress.totalCount = totalCount;
    packProgress.progress = averageProgress; // <-- Сохраняем реальный процент
    packProgress.updatedAt = new Date();

    // Сохраняем обновленный прогресс
    return await this.kanjiPackProgressRepository.save(packProgress);
  }

  /**
   * Получает прогресс пака для пользователя
   * @param userId ID пользователя
   * @param packId ID пака кандзи
   */
  async getPackProgress(
    userId: number,
    packId: number,
  ): Promise<KanjiPackProgress | null> {
    return await this.kanjiPackProgressRepository.findOne({
      where: {
        userId: userId,
        packId: packId,
      },
    });
  }

  /**
   * Сбрасывает прогресс пака
   * @param userId ID пользователя
   * @param packId ID пака кандзи
   */
  async resetPackProgress(userId: number, packId: number): Promise<void> {
    await this.kanjiPackProgressRepository.delete({
      userId: userId,
      packId: packId,
    });
  }
}
