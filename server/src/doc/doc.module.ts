import { Module } from '@nestjs/common';
import { SettingsService } from 'src/settings/settings.service';

import { DocController } from './doc.controller';
import { DocService } from './doc.service';

@Module({
  providers: [DocService, SettingsService],
  controllers: [DocController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DocModule {}
