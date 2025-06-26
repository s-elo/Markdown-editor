import { MiddlewareConsumer, Module } from '@nestjs/common';
import { GitCheckMiddleware } from 'src/middlewares/git-checkt';
import { SettingsService } from 'src/settings/settings.service';

import { GitController } from './git.controller';
import { GitService } from './git.service';

@Module({
  providers: [GitService, SettingsService],
  controllers: [GitController],
})
export class GitModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer.apply(GitCheckMiddleware).forRoutes(GitController);
  }
}
