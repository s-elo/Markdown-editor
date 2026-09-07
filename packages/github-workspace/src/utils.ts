import type { OperationMetadata, WorkspaceDescriptor, WorkspaceRules } from './types';

export const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const parentPath = (path: string) => path.split('/').slice(0, -1).join('/');

export const isSameOrDescendant = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

export const createId = (): string => window.crypto.randomUUID();

export const createOperationMetadata = (
  label: string,
  scopePaths: string[],
  groupId = createId(),
): OperationMetadata => ({
  groupId,
  label,
  scopePaths,
});

export const getWorkspaceKey = (descriptor: WorkspaceDescriptor) =>
  [descriptor.owner, descriptor.repo, descriptor.branch, cleanPath(descriptor.docsRoot)].join('/');

export const isProtectedPath = (path: string, rules: WorkspaceRules) =>
  rules.protectedPaths?.some((protectedPath) => cleanPath(protectedPath) === path) ?? false;
