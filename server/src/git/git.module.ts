import { MiddlewareConsumer, Module } from '@nestjs/common';
import { GitCheckMiddleware } from 'src/middlewares/git-checkt';
import { SettingsModule } from 'src/settings/settings.module';

import { GitController } from './git.controller';
import { GitService } from './git.service';

@Module({
  imports: [SettingsModule],
  providers: [GitService],
  controllers: [GitController],
})
export class GitModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer.apply(GitCheckMiddleware).forRoutes(GitController);
  }
}
