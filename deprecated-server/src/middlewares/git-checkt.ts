import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CheckRepoActions } from 'simple-git';
import { GitService } from 'src/git/git.service';

@Injectable()
export class GitCheckMiddleware implements NestMiddleware {
  constructor(private readonly gitService: GitService) {}

  public async use(_: Request, res: Response, next: NextFunction) {
    const git = this.gitService.git;

    if (!git || !(await git.checkIsRepo('root' as CheckRepoActions))) {
      return res.send({ data: { noGit: true }, code: 0, message: 'No git repo' });
    }

    next();
  }
}
