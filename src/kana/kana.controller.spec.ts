import { Test, TestingModule } from '@nestjs/testing';
import { KanaController } from './kana.controller';
import { KanaService } from './kana.service';

describe('KanaController', () => {
  let controller: KanaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KanaController],
      providers: [KanaService],
    }).compile();

    controller = module.get<KanaController>(KanaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
