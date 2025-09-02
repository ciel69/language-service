import { Controller, Get } from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';

import { PolicyService } from './policy.service';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get('active')
  @Public()
  async getCurrent() {
    const policy = await this.policyService.getActivePolicy();
    return {
      version: policy.version,
      content: policy.content,
      createdAt: policy.createdAt,
    };
  }
}
