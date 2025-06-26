import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Settings } from 'src/doc/type';

import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('/')
  public getSettings(): Settings {
    return this.settingsService.settings;
  }

  @Patch('/')
  public updateSettings(@Body() settings: Settings): void {
    this.settingsService.updateSettings(settings);
  }
}
