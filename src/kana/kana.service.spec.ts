import { Test, TestingModule } from '@nestjs/testing';
import { KanaService } from './kana.service';

describe('KanaService', () => {
  let service: KanaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KanaService],
    }).compile();

    service = module.get<KanaService>(KanaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
