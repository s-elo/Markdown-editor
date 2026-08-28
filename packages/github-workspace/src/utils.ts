import type { ChangeMetadata, WorkspaceConventions, WorkspaceDescriptor } from './types';

export const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const parentPath = (path: string) => path.split('/').slice(0, -1).join('/');

export const isSameOrDescendant = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

export const pathsOverlap = (left: string, right: string) =>
  isSameOrDescendant(left, right) || isSameOrDescendant(right, left);

export const createId = (): string => window.crypto.randomUUID();

export const makeMetadata = (label: string, scopePaths: string[], groupId = createId()): ChangeMetadata => ({
  groupId,
  label,
  scopePaths,
});

export const getWorkspaceKey = (descriptor: WorkspaceDescriptor) =>
  [descriptor.owner, descriptor.repo, descriptor.branch, cleanPath(descriptor.docsRoot)].join('/');

export const isManagedPath = (path: string, conventions: WorkspaceConventions) =>
  conventions.managedPaths?.some((managedPath) => cleanPath(managedPath) === path) ?? false;
