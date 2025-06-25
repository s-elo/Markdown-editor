import { Module } from '@nestjs/common';

import { DocController } from './doc.controller';
import { DocService } from './doc.service';

@Module({
  providers: [DocService],
  controllers: [DocController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DocModule {}
