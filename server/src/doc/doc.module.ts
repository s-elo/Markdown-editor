import { Module } from '@nestjs/common';
import { SettingsModule } from 'src/settings/settings.module';

import { DocController } from './doc.controller';
import { DocService } from './doc.service';

@Module({
  imports: [SettingsModule],
  providers: [DocService],
  controllers: [DocController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DocModule {}
