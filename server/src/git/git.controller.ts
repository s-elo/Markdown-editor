import { Controller, Get, Inject, Post } from '@nestjs/common';
import { ExceptionCatcher } from 'src/utils/decorators';
import { Logger } from 'winston';

import { GitService } from './git.service';
import { Change } from './type';

@Controller('git')
export class GitController {
  constructor(private readonly gitService: GitService, @Inject('winston') private readonly logger: Logger) {}

  @Get('/status')
  @ExceptionCatcher('Failed to get git status')
  public async getStatus() {
    this.logger.info('[GitController] getStatus');
    return this.gitService.getStatus();
  }

  @Post('/add')
  @ExceptionCatcher('Failed to add git changes')
  public async add(changePaths: string[]) {
    this.logger.info('[GitController] add', { changePaths });
    return this.gitService.add(changePaths);
  }

  @Post('/commit')
  @ExceptionCatcher('Failed to commit git changes')
  public async commit(title: string, body: string) {
    this.logger.info('[GitController] commit', { title, body });
    return this.gitService.commit(title, body);
  }

  @Post('/push')
  @ExceptionCatcher('Failed to push git changes')
  public async push() {
    this.logger.info('[GitController] push');
    return this.gitService.push();
  }

  @Post('/pull')
  @ExceptionCatcher('Failed to pull git changes')
  public async pull() {
    this.logger.info('[GitController] pull');
    return this.gitService.pull();
  }

  @Post('/restore')
  @ExceptionCatcher('Failed to restore git changes')
  public async restore(staged: boolean, changes: Change[]) {
    this.logger.info('[GitController] restore', { staged, changes });
    return this.gitService.restore(staged, changes);
  }
}
