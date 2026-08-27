import { GitWorkspaceStore, type WorkspaceSnapshot } from '@markdown-editor/github-workspace';
import { useSyncExternalStore } from 'react';

export const githubWorkspaceStore = new GitWorkspaceStore();

export const useGitHubWorkspaceSnapshot = (): WorkspaceSnapshot =>
  useSyncExternalStore(
    githubWorkspaceStore.subscribe,
    githubWorkspaceStore.getSnapshot,
    githubWorkspaceStore.getSnapshot,
  );
