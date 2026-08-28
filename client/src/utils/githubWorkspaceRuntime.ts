import {
  GitWorkspaceStore,
  IndexedDbWorkspacePersistence,
  type WorkspaceSnapshot,
} from '@markdown-editor/github-workspace';
import { useSyncExternalStore } from 'react';

import {
  GITHUB_WORKSPACE_DATABASE_NAME,
  GITHUB_WORKSPACE_EMPTY_DIRECTORY_MARKER,
  GITHUB_WORKSPACE_STORE_NAME,
  WORKSPACE_SETTINGS_PATH,
} from '@/constants';

export const githubWorkspaceStore = new GitWorkspaceStore(
  new IndexedDbWorkspacePersistence({
    databaseName: GITHUB_WORKSPACE_DATABASE_NAME,
    storeName: GITHUB_WORKSPACE_STORE_NAME,
  }),
  {
    emptyDirectoryMarker: GITHUB_WORKSPACE_EMPTY_DIRECTORY_MARKER,
    managedPaths: [WORKSPACE_SETTINGS_PATH],
  },
);

export const useGitHubWorkspaceSnapshot = (): WorkspaceSnapshot =>
  useSyncExternalStore(
    githubWorkspaceStore.subscribe,
    githubWorkspaceStore.getSnapshot,
    githubWorkspaceStore.getSnapshot,
  );
