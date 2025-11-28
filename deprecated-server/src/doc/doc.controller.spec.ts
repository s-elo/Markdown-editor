import { Test, TestingModule } from '@nestjs/testing';

import { DocController } from './doc.controller';

describe('DocController', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let controller: DocController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocController],
    }).compile();

    controller = module.get<DocController>(DocController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
