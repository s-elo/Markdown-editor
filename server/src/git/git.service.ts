import fs from 'fs';
import path from 'path';

import { Injectable } from '@nestjs/common';
import simpleGit, { SimpleGit } from 'simple-git';
import { Settings } from 'src/doc/type';
import { SettingsService } from 'src/settings/settings.service';

import { Change, StatusType } from './type';

// const GIT_SSH_ADDRESS_REG = /^git@github\.com:(.+)\/(.+)\.git$/;

@Injectable()
export class GitService {
  public git: SimpleGit | null = null;

  constructor(private readonly settingsService: SettingsService) {
    this._syncGit(this.settingsService.settings);
    this.settingsService.onSettingsUpdated(this._syncGit.bind(this));
  }

  public async getStatus() {
    // will check in middleware
    const git = this.git!;

    const statusMap = {
      A: 'ADDED',
      M: 'MODIFIED',
      D: 'DELETED',
      U: 'UNTRACKED',
      R: 'RENAME',
    };
    const { files } = await git.status();

    const workSpace: Change[] = [];
    const staged: Change[] = [];

    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const { path: filePath, index, working_dir } of files) {
      // untracked
      if (working_dir.trim() === '?' && index.trim() === '?') {
        workSpace.push({
          changePath: filePath,
          status: 'UNTRACKED',
        });

        continue;
      }

      if (working_dir.trim() !== '') {
        workSpace.push({
          changePath: filePath,
          status: statusMap[working_dir as keyof typeof statusMap] as StatusType,
        });
      }

      if (index.trim() !== '') {
        staged.push({
          changePath: filePath,
          status: statusMap[index as keyof typeof statusMap] as StatusType,
        });
      }
    }

    return {
      workSpace,
      staged,
      changes: files.length !== 0,
      noGit: false,
    };
  }

  public async add(changePaths: string[]) {
    const git = this.git!;
    await git.add(changePaths);
  }

  public async commit(title: string, body: string) {
    const git = this.git!;
    await git.commit([title, body]);
  }

  public async push() {
    const git = this.git!;
    await git.push();
  }

  public async pull() {
    const git = this.git!;
    await git.pull();
  }

  public async restore(staged: boolean, changes: Change[]) {
    const git = this.git!;

    if (staged) {
      await git.raw(['restore', '--staged', ...changes.map((change) => change.changePath)]);
    } else {
      // at the working space
      const unTracked = changes.filter((change) => change.status === 'UNTRACKED');

      // delete the untracked files
      for (const change of unTracked) {
        try {
          fs.rmSync(path.resolve(this.settingsService.settings.docRootPath, change.changePath));
        } catch {
          throw new Error(`can not delete ${change.changePath}`);
        }
      }

      if (unTracked.length < changes.length) {
        await git.raw([
          'restore',
          ...changes.filter((change) => change.status !== 'UNTRACKED').map((change) => change.changePath),
        ]);
      }
    }
  }

  protected _syncGit(settings: Settings): void {
    const { docRootPath } = settings;
    this.git = fs.existsSync(docRootPath) ? simpleGit(docRootPath) : null;
  }
}
