import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Settings } from 'src/doc/type';
import { ExceptionCatcher } from 'src/utils/decorators';

import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('/')
  @ExceptionCatcher('Failed to get settings')
  public getSettings(): Settings {
    return this.settingsService.settings;
  }

  @Patch('/')
  @ExceptionCatcher('Failed to update settings')
  public updateSettings(@Body() settings: Settings): void {
    this.settingsService.updateSettings(settings);
  }
}
