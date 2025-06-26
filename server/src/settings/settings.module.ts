import { Module } from '@nestjs/common';

import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  providers: [SettingsService],
  controllers: [SettingsController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SettingsModule {}
