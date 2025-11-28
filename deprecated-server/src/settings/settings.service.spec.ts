import { Test, TestingModule } from '@nestjs/testing';

import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
