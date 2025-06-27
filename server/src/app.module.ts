import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { DocModule } from './doc/doc.module';
import { GitModule } from './git/git.module';
import { SettingsModule } from './settings/settings.module';
import { projectRoot, serverRoot } from './utils';

const logPath = serverRoot('logs');

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: projectRoot('client/build'),
      serveRoot: '/',
      // renderPath: '{*any}',
    }),
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          return `[${level}]${message as string} | ${timestamp as string} | ${JSON.stringify(metadata)}`;
        }),
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          dirname: logPath,
          filename: 'info.log',
          level: 'info',
        }),
        new winston.transports.File({
          dirname: logPath,
          filename: 'error.log',
          level: 'error',
        }),
      ],
    }),
    EventEmitterModule.forRoot(),
    SettingsModule,
    DocModule,
    GitModule,
  ],
  controllers: [],
  providers: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
