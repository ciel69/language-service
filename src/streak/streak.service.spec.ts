import { Test, TestingModule } from '@nestjs/testing';
import { StreakHistoryService } from './streak.service';

describe('StreakHistoryService', () => {
  let service: StreakHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreakHistoryService],
    }).compile();

    service = module.get<StreakHistoryService>(StreakHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
