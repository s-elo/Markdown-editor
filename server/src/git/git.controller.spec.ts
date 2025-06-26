import { Test, TestingModule } from '@nestjs/testing';

import { GitController } from './git.controller';

describe('GitController', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let controller: GitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitController],
    }).compile();

    controller = module.get<GitController>(GitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
