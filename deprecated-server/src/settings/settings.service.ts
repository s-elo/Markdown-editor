import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import { Settings } from 'src/doc/type';
import { projectRoot } from 'src/utils';
import { Logger } from 'winston';

const DEFAULT_SETTINGS = {
  docRootPath: projectRoot('fallback-docs'),
  ignoreDirs: ['.git', 'imgs', 'node_modules', 'dist'],
};

const EDITOR_SETTINGS_PATH = projectRoot('editor-settings.json');

@Injectable()
export class SettingsService {
  public settings: Settings;

  constructor(@Inject('winston') private readonly logger: Logger, private readonly eventEmitter: EventEmitter2) {
    const settings = existsSync(EDITOR_SETTINGS_PATH)
      ? (JSON.parse(readFileSync(EDITOR_SETTINGS_PATH, 'utf-8')) as Settings)
      : null;

    if (!settings) {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      writeFileSync(EDITOR_SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    }

    this.settings = settings ?? DEFAULT_SETTINGS;

    this.logger.info(`[SettingsService] initialized with settings: ${JSON.stringify(this.settings)}`);
  }

  public updateSettings(settings: Settings): void {
    if (!existsSync(settings.docRootPath)) {
      this.logger.error(`[SettingsService] docRootPath ${settings.docRootPath as string} does not exist`);
      return;
    }

    this.settings = { ...this.settings, ...settings };
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    writeFileSync(EDITOR_SETTINGS_PATH, JSON.stringify(this.settings, null, 2));

    this.eventEmitter.emit('settings.updated', this.settings);

    this.logger.info(`[SettingsService] Settings updated: ${JSON.stringify(this.settings)}`);
  }

  public onSettingsUpdated(callback: (settings: Settings) => void): void {
    this.eventEmitter.on('settings.updated', callback);
  }
}
