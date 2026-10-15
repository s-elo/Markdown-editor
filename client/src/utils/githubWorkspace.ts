/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-control-regex */
import type { WorkspaceDescriptor } from '@markdown-editor/github-workspace';

import { denormalizePath, normalizePath } from '@/utils/utils';

const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const getRepositoryDocPath = (config: WorkspaceDescriptor, logicalPath: string, isFile: boolean) => {
  const relative = denormalizePath(logicalPath).filter(Boolean).join('/');
  const path = [cleanPath(config.docsRoot), relative].filter(Boolean).join('/');
  return isFile ? `${path}.md` : path;
};

export const validateWorkspaceName = (name: string) => {
  const value = name.trim();
  if (!value || value === '.' || value === '..' || /[\\/\u0000-\u001f]/.test(value)) {
    throw new Error('Name cannot be empty or contain path separators, control characters, . or ..');
  }
  return value.endsWith('.md') ? value.slice(0, -3) : value;
};

export const getVisibleLogicalPath = (config: WorkspaceDescriptor, repositoryPath: string) => {
  const root = cleanPath(config.docsRoot);
  const relative = root ? repositoryPath.slice(root.length).replace(/^\//, '') : repositoryPath;
  return normalizePath(relative.endsWith('.md') ? relative.slice(0, -3) : relative);
};
