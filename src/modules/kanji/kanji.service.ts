import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreateKanjiDto } from './dto/create-kanji.dto';
import { UpdateKanjiDto } from './dto/update-kanji.dto';
import { Kanji } from '@/modules/kanji/entities/kanji.entity';
import { KanjiPackProgress } from '@/modules/kanji/entities/kanji-pack-progress.entity';
import { KanjiPack } from '@/modules/kanji/entities/kanji-pack.entity';
import {
  KanjiDetailDto,
  KanjiWithProgressDto,
  WordDto,
} from '@/modules/kanji/dto';

@Injectable()
export class KanjiService {
  constructor(
    @InjectRepository(Kanji)
    private readonly kanjiRepository: Repository<Kanji>,
    @InjectRepository(KanjiPack)
    private readonly kanjiPackRepository: Repository<KanjiPack>,
    @InjectRepository(KanjiPackProgress)
    private readonly kanjiPackProgressRepository: Repository<KanjiPackProgress>,
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

  // Получить все кандзи в паке с прогрессом пользователя
  async getKanjiByPackIdWithProgress(
    packId: number,
    userId: number,
  ): Promise<KanjiWithProgressDto[]> {
    const pack = await this.kanjiPackRepository.findOne({
      where: { id: packId },
    });

    if (!pack) {
      throw new NotFoundException(`KanjiPack with ID ${packId} not found`);
    }

    // Получаем кандзи с прогрессом через LEFT JOIN
    const kanjiWithProgress = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .leftJoinAndSelect(
        'kanji.progress',
        'progress',
        'progress.userId = :userId',
        { userId },
      )
      .where('kanji.pack_id = :packId', { packId })
      .orderBy('kanji.id', 'ASC')
      .getMany();

    return this.mapKanjiToDto(kanjiWithProgress);
  }

  // Получить случайные кандзи из пака с прогрессом пользователя
  async getRandomKanjiFromPackWithProgress(
    packId: number,
    userId: number,
    limit: number,
  ): Promise<KanjiWithProgressDto[]> {
    const pack = await this.kanjiPackRepository.findOne({
      where: { id: packId },
    });

    if (!pack) {
      throw new NotFoundException(`KanjiPack with ID ${packId} not found`);
    }

    // Сначала получаем все ID кандзи в паке
    const kanjiIds = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .select('kanji.id')
      .where('kanji.pack_id = :packId', { packId })
      .getRawMany();

    if (kanjiIds.length === 0) {
      return [];
    }

    // Перемешиваем и берем нужное количество
    const shuffledIds = kanjiIds
      .map((row) => row.kanji_id)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, kanjiIds.length));

    // Получаем кандзи с прогрессом
    const kanjiWithProgress = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .leftJoinAndSelect(
        'kanji.progress',
        'progress',
        'progress.userId = :userId',
        { userId },
      )
      .where('kanji.id IN (:...ids)', { ids: shuffledIds })
      .getMany();

    return this.mapKanjiToDto(kanjiWithProgress);
  }

  // Вспомогательный метод для маппинга в DTO
  private mapKanjiToDto(kanjiList: Kanji[]): KanjiWithProgressDto[] {
    return kanjiList.map((kanji) => {
      // Парсим массивы из строки, если они приходят как строки
      const parseArray = (value: string | string[] | undefined): string[] => {
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          // Убираем фигурные скобки и разбиваем по запятым
          return value
            .replace(/^\{|\}$/g, '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
        return [];
      };

      return {
        id: kanji.id,
        char: kanji.char,
        on: parseArray(kanji.on),
        kun: parseArray(kanji.kun),
        meaning: kanji.meaning,
        level: kanji.level,
        progress:
          kanji.progress && kanji.progress.length > 0
            ? {
                id: kanji.progress[0].id,
                progress: kanji.progress[0].progress,
                correctAttempts: kanji.progress[0].correctAttempts,
                incorrectAttempts: kanji.progress[0].incorrectAttempts,
                perceivedDifficulty: kanji.progress[0].perceivedDifficulty,
                nextReviewAt: kanji.progress[0].nextReviewAt,
                stage: kanji.progress[0].stage,
                createdAt: kanji.progress[0].createdAt,
                updatedAt: kanji.progress[0].updatedAt,
              }
            : null, // Всегда возвращаем null, если нет прогресса
      };
    });
  }

  async getPacksWithProgress(level: string, userId: number) {
    const packs = await this.kanjiPackRepository
      .createQueryBuilder('pack')
      .select([
        'pack.id',
        'pack.title',
        'pack.description',
        'pack.order',
        'COUNT(kanji.id) as totalCount',
      ])
      .leftJoin('pack.kanji', 'kanji')
      .where('pack.level = :level', { level })
      .groupBy('pack.id')
      .orderBy('pack.order', 'ASC')
      .getRawMany();

    const packIds = packs.map((p) => p.pack_id);
    const progressMap = await this.kanjiPackProgressRepository
      .createQueryBuilder('progress')
      .select(['progress.packId', 'progress.learnedCount'])
      .where('progress.packId IN (:...packIds)', { packIds })
      .andWhere('progress.userId = :userId', { userId })
      .getRawMany()
      .then((rows) => {
        const map = {};
        rows.forEach((r) => {
          map[r.progress_packId] = r.progress_learnedCount;
        });
        return map;
      });

    return packs.map((p) => {
      const learned = progressMap[p.pack_id] || 0;
      const total = parseInt(p.totalCount, 10);
      return {
        id: p.pack_id,
        title: p.pack_title,
        description: p.pack_description,
        order: p.pack_order,
        totalKanji: total,
        learnedKanji: learned,
        progressPercent: Math.round((learned / (total || 1)) * 100),
      };
    });
  }

  async getKanjiDetail(
    id: number,
    userId?: number,
  ): Promise<KanjiDetailDto | null> {
    // Получаем кандзи с прогрессом и словами
    const kanji = await this.kanjiRepository
      .createQueryBuilder('kanji')
      .leftJoinAndSelect('kanji.words', 'words')
      .leftJoinAndSelect(
        'kanji.progress',
        'progress',
        'progress.userId = :userId',
        { userId },
      )
      .where('kanji.id = :id', { id })
      .getOne();

    if (!kanji) {
      return null;
    }

    // Парсим массивы
    const parseArray = (value: string | string[] | undefined): string[] => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return value
          .replace(/^\{|\}$/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    };

    // Маппим слова в DTO
    const wordsDto: WordDto[] = kanji.words.map((word) => ({
      id: word.id,
      word: word.word,
      kana: word.kana,
      romaji: word.romaji,
      meaning: word.meaning,
      category: word.category,
      level: word.level,
    }));

    return {
      id: kanji.id,
      char: kanji.char,
      on: parseArray(kanji.on),
      kun: parseArray(kanji.kun),
      meaning: kanji.meaning,
      level: kanji.level,
      progress:
        kanji.progress && kanji.progress.length > 0
          ? {
              id: kanji.progress[0].id,
              progress: kanji.progress[0].progress,
              correctAttempts: kanji.progress[0].correctAttempts,
              incorrectAttempts: kanji.progress[0].incorrectAttempts,
              perceivedDifficulty: kanji.progress[0].perceivedDifficulty,
              nextReviewAt: kanji.progress[0].nextReviewAt,
              stage: kanji.progress[0].stage,
              createdAt: kanji.progress[0].createdAt,
              updatedAt: kanji.progress[0].updatedAt,
            }
          : null,
      words: wordsDto,
    };
  }
}
