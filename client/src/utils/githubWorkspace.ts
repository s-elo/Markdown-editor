/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable no-control-regex */
import type { DocTreeNode } from '@/redux-api/docsApiType';
import type { GitHubOverlayEntry, GitHubTreeEntry, GitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';

import { denormalizePath, normalizePath } from '@/utils/utils';

export interface GitHubWorkspaceLike {
  config: GitHubWorkspaceConfig;
  baseEntries: Record<string, GitHubTreeEntry>;
  working: Record<string, GitHubOverlayEntry>;
}

export type EffectiveGitHubEntry = GitHubTreeEntry & { content?: string; operationId?: string; label?: string };

const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const getRepositoryDocPath = (config: GitHubWorkspaceConfig, logicalPath: string, isFile: boolean) => {
  const relative = denormalizePath(logicalPath).filter(Boolean).join('/');
  const path = [cleanPath(config.docsRoot), relative].filter(Boolean).join('/');
  return isFile ? `${path}.md` : path;
};

export const getEffectiveGitHubEntries = (workspace: GitHubWorkspaceLike): Record<string, EffectiveGitHubEntry> => {
  const entries: Record<string, EffectiveGitHubEntry> = { ...workspace.baseEntries };
  Object.values(workspace.working).forEach((overlay) => {
    if (overlay.action === 'delete') {
      delete entries[overlay.path];
      return;
    }
    entries[overlay.path] = {
      path: overlay.path,
      mode: overlay.mode,
      type: overlay.type,
      sha: overlay.sha ?? '',
      content: overlay.content,
      operationId: overlay.operationId,
      label: overlay.label,
    };
  });
  return entries;
};

const isHiddenMenuPath = (parts: string[]) =>
  parts.some((part) => (part.startsWith('.') && part !== '.gitkeep') || part === '_assets');

export const getGitHubSubItems = (workspace: GitHubWorkspaceLike, encodedFolderPath = ''): DocTreeNode[] => {
  const root = cleanPath(workspace.config.docsRoot);
  const folderParts = encodedFolderPath ? denormalizePath(encodedFolderPath).filter(Boolean) : [];
  const folderPath = folderParts.join('/');
  const childDirectories = new Set<string>();
  const childFiles = new Set<string>();

  Object.keys(getEffectiveGitHubEntries(workspace)).forEach((repositoryPath) => {
    if (root && repositoryPath !== root && !repositoryPath.startsWith(`${root}/`)) return;
    const relativePath = root ? repositoryPath.slice(root.length).replace(/^\//, '') : repositoryPath;
    const parts = relativePath.split('/').filter(Boolean);
    if (!parts.length || isHiddenMenuPath(parts.slice(0, -1))) return;
    if (parts.slice(0, folderParts.length).join('/') !== folderPath) return;
    const remaining = parts.slice(folderParts.length);
    if (remaining.length > 1) {
      if (!remaining[0].startsWith('.')) childDirectories.add(remaining[0]);
      return;
    }
    const name = remaining[0];
    if (name === '.gitkeep' || name.startsWith('.')) return;
    if (name.endsWith('.md')) childFiles.add(name.slice(0, -3));
  });

  const directories = [...childDirectories]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const path = [...folderParts, name];
      return { id: `github-dir-${path.join('-')}`, name, isFile: false, path };
    });
  const files = [...childFiles]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const path = [...folderParts, name];
      return { id: `github-file-${path.join('-')}`, name, isFile: true, path };
    });
  return [...directories, ...files];
};

export const createOperationId = () => window.crypto.randomUUID();

export const validateWorkspaceName = (name: string) => {
  const value = name.trim();
  if (!value || value === '.' || value === '..' || /[\\/\u0000-\u001f]/.test(value)) {
    throw new Error('Name cannot be empty or contain path separators, control characters, . or ..');
  }
  return value.endsWith('.md') ? value.slice(0, -3) : value;
};

export const getVisibleLogicalPath = (workspace: GitHubWorkspaceLike, repositoryPath: string) => {
  const root = cleanPath(workspace.config.docsRoot);
  const relative = root ? repositoryPath.slice(root.length).replace(/^\//, '') : repositoryPath;
  return normalizePath(relative.endsWith('.md') ? relative.slice(0, -3) : relative);
};
