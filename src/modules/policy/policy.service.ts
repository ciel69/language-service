import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PrivacyPolicy } from '@/modules/policy/entities/privacy-policy.entity';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(PrivacyPolicy)
    private readonly policyRepository: Repository<PrivacyPolicy>,
  ) {}

  /**
   * Возвращает активную политику конфиденциальности
   */
  async getActivePolicy() {
    const policy = await this.policyRepository.findOne({
      where: { isActive: true },
      select: ['id', 'version', 'content', 'createdAt'],
    });

    if (!policy) {
      throw new Error(
        'Активная политика конфиденциальности не найдена. Пожалуйста, добавьте хотя бы одну версию.',
      );
    }

    return policy;
  }
}
