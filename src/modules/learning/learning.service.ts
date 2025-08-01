import { Injectable } from '@nestjs/common';
import { CreateLearningDto } from './dto/create-learning.dto';
import { UpdateLearningDto } from './dto/update-learning.dto';
import { LearningSection } from '@/modules/learning/entities/learning-section.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LessonModuleProgress } from '@/modules/progress/entities/lesson-module-progress.entity';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(LearningSection)
    private readonly learningSectionRepository: Repository<LearningSection>,
    // Предполагается, что LessonModuleProgress репозиторий тоже инжектируется
    // @InjectRepository(LessonModuleProgress)
    // private readonly lessonModuleProgressRepository: Repository<LessonModuleProgress>,
  ) {}

  /**
   * Получает все разделы со связанными модулями и прогрессом пользователя по этим модулям.
   * @param userId ID пользователя
   * @returns Promise<LearningSectionWithModulesAndProgress[]>
   */
  async findAllWithModulesAndProgressForUser(userId: number): Promise<any[]> {
    const queryBuilder = this.learningSectionRepository
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.modules', 'module')
      .leftJoinAndMapOne(
        'module.progress',
        LessonModuleProgress,
        'progress',
        'progress.moduleId = module.id AND progress.userId = :userId',
        { userId },
      )
      .orderBy('section.order', 'ASC')
      .addOrderBy('module.order', 'ASC');

    return await queryBuilder.getMany();
  }

  create(createLearningDto: CreateLearningDto) {
    return 'This action adds a new learning';
  }

  findAll() {
    return `This action returns all learning`;
  }

  findOne(id: number) {
    return `This action returns a #${id} learning`;
  }

  update(id: number, updateLearningDto: UpdateLearningDto) {
    return `This action updates a #${id} learning`;
  }

  remove(id: number) {
    return `This action removes a #${id} learning`;
  }
}
