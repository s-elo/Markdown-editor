import { Test, TestingModule } from '@nestjs/testing';

import { GitService } from './git.service';

describe('GitService', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let service: GitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitService],
    }).compile();

    service = module.get<GitService>(GitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
