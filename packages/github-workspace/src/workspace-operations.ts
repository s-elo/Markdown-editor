/* eslint-disable @typescript-eslint/no-dynamic-delete */

import {
  cloneEntry,
  cloneOperationMetadata,
  copyPathState,
  createDirectoryEntry,
  getDirectoryPaths,
  getStagedChanges,
  getUnstagedChanges,
} from './git-status';
import { GitMode } from './types';
import { cleanPath, createId, createOperationMetadata, isProtectedPath, isSameOrDescendant, parentPath } from './utils';

import type { OperationMetadata, TreeState, WorkspaceDescriptor, WorkspaceEntry, WorkspaceRules } from './types';

export const assertInScope = (descriptor: WorkspaceDescriptor | null, path: string, rules: WorkspaceRules) => {
  if (!descriptor) throw new Error('No GitHub workspace is open.');
  const clean = cleanPath(path);
  const segments = clean.split('/');
  if (!clean || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Workspace paths cannot be empty or contain traversal segments.');
  }
  const root = cleanPath(descriptor.docsRoot);
  if (root && !clean.startsWith(`${root}/`)) throw new Error(`${path} is outside the configured docs root.`);
  if (isProtectedPath(clean, rules)) {
    throw new Error(`${path} is protected by the workspace and cannot be changed here.`);
  }
};

const assertAvailable = (tree: TreeState, path: string) => {
  if (tree.entries[path] || Object.keys(tree.entries).some((entryPath) => isSameOrDescendant(entryPath, path))) {
    throw new Error(`${path} already exists.`);
  }
};

const ensureParents = (
  tree: TreeState,
  descriptor: WorkspaceDescriptor,
  path: string,
  operationMetadata?: OperationMetadata,
) => {
  const root = cleanPath(descriptor.docsRoot);
  getDirectoryPaths(path, root).forEach((directory) => {
    tree.entries[directory] ??= { ...createDirectoryEntry(directory), operationMetadata };
  });
};

const keepEmptyDirectoryLocal = (tree: TreeState, path: string, operationMetadata: OperationMetadata) => {
  const directory = tree.entries[path];
  if (!directory || directory.kind !== 'directory') return;
  const hasDescendant = Object.keys(tree.entries).some((entryPath) => entryPath.startsWith(`${path}/`));
  if (!hasDescendant) directory.operationMetadata = operationMetadata;
};

export const listDirectoryEntries = (tree: TreeState, path: string) => {
  const directory = cleanPath(path);
  return Object.values(tree.entries)
    .filter((entry) => parentPath(entry.path) === directory)
    .map(cloneEntry)
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === 'directory' ? -1 : 1;
      return left.path.localeCompare(right.path);
    });
};

export const resolveMovedEntryPath = (tree: TreeState, aliases: Map<string, string>, path: string) => {
  if (tree.entries[path]) return path;
  let resolved = path;
  const visited = new Set<string>();
  while (aliases.has(resolved) && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = aliases.get(resolved)!;
  }
  return resolved;
};

export const getWorkspaceEntry = (tree: TreeState, aliases: Map<string, string>, path: string) => {
  const resolved = resolveMovedEntryPath(tree, aliases, cleanPath(path));
  const entry = tree.entries[resolved];
  return entry ? cloneEntry(entry) : undefined;
};

export const createFileEntry = (
  tree: TreeState,
  descriptor: WorkspaceDescriptor,
  path: string,
  content: string,
  operationMetadata: OperationMetadata,
) => {
  assertAvailable(tree, path);
  ensureParents(tree, descriptor, path, operationMetadata);
  tree.entries[path] = {
    id: createId(),
    path,
    kind: 'file',
    mode: GitMode.File,
    type: 'blob',
    content,
    operationMetadata,
  };
};

export const createDirectory = (
  tree: TreeState,
  descriptor: WorkspaceDescriptor,
  path: string,
  operationMetadata: OperationMetadata,
) => {
  assertAvailable(tree, path);
  ensureParents(tree, descriptor, `${path}/child`, operationMetadata);
  tree.entries[path] = { ...createDirectoryEntry(path), id: createId(), operationMetadata };
};

export const writeFileEntry = (
  tree: TreeState,
  path: string,
  content: string,
  operationMetadata: OperationMetadata,
) => {
  const entry = tree.entries[path];
  if (!entry || entry.kind !== 'file') throw new Error(`The file ${path} does not exist.`);
  entry.content = content;
  entry.operationMetadata = operationMetadata;
};

export const deleteWorkspaceEntry = (
  tree: TreeState,
  baseTree: TreeState,
  path: string,
  operationMetadata: OperationMetadata,
) => {
  const targets = Object.keys(tree.entries).filter((entryPath) => isSameOrDescendant(entryPath, path));
  if (!targets.length) throw new Error(`${path} does not exist.`);
  targets.forEach((target) => {
    const origin = Object.values(baseTree.entries).find((entry) => entry.id === tree.entries[target]?.id);
    delete tree.entries[target];
    tree.deletedOperationMetadata[target] = operationMetadata;
    if (origin) tree.deletedOperationMetadata[origin.path] = operationMetadata;
  });
  keepEmptyDirectoryLocal(tree, parentPath(path), operationMetadata);
};

export const getTransferOperation = (
  workingTree: TreeState,
  stagedTree: TreeState,
  source: string,
  destination: string,
  isCopy: boolean,
) => {
  const existing = workingTree.entries[source];
  if (!existing) throw new Error(`${source} does not exist.`);
  const inheritedOperationMetadata =
    !isCopy && existing.operationMetadata && !stagedTree.entries[source] ? existing.operationMetadata : undefined;
  const operationMetadata =
    inheritedOperationMetadata ??
    createOperationMetadata(`${isCopy ? 'Copy' : 'Move'} ${source} to ${destination}`, [source, destination]);
  operationMetadata.label = inheritedOperationMetadata
    ? `${existing.kind === 'file' ? 'Create file' : 'Create folder'} ${destination}`
    : operationMetadata.label;
  operationMetadata.scopePaths = [source, destination];
  return { existing, operationMetadata };
};

export const transferWorkspaceEntry = (
  tree: TreeState,
  descriptor: WorkspaceDescriptor,
  aliases: Map<string, string>,
  existing: WorkspaceEntry,
  source: string,
  destination: string,
  isCopy: boolean,
  operationMetadata: OperationMetadata,
) => {
  if (existing.kind === 'directory' && isSameOrDescendant(destination, source)) {
    throw new Error('A directory cannot be moved or copied into itself.');
  }
  assertAvailable(tree, destination);
  const targets = Object.values(tree.entries).filter((entry) => isSameOrDescendant(entry.path, source));
  ensureParents(tree, descriptor, `${destination}/child`, operationMetadata);
  targets.forEach((entry) => {
    const destinationPath = entry.path === source ? destination : `${destination}${entry.path.slice(source.length)}`;
    tree.entries[destinationPath] = {
      ...cloneEntry(entry),
      id: isCopy ? createId() : entry.id,
      path: destinationPath,
      operationMetadata,
    };
    delete tree.deletedOperationMetadata[destinationPath];
    if (!isCopy) {
      delete tree.entries[entry.path];
      tree.deletedOperationMetadata[entry.path] = operationMetadata;
      aliases.set(entry.path, destinationPath);
    }
  });
  if (!isCopy) keepEmptyDirectoryLocal(tree, parentPath(source), operationMetadata);
};

export const stageChanges = (
  baseTree: TreeState,
  stagedTree: TreeState,
  workingTree: TreeState,
  groupIds: string[],
) => {
  const selected = new Set(groupIds);
  getUnstagedChanges(stagedTree, workingTree)
    .filter((change) => selected.has(change.groupId))
    .forEach((change) => {
      copyPathState(workingTree, stagedTree, change.path);
      if (!change.newEntry && change.oldEntry) {
        const origin = Object.values(baseTree.entries).find((entry) => entry.id === change.oldEntry?.id);
        if (origin) stagedTree.deletedOperationMetadata[origin.path] = cloneOperationMetadata(change);
      }
    });
};

export const unstageChanges = (baseTree: TreeState, stagedTree: TreeState, groupIds: string[]) => {
  const selected = new Set(groupIds);
  getStagedChanges(baseTree, stagedTree)
    .filter((change) => selected.has(change.groupId))
    .forEach((change) => {
      copyPathState(baseTree, stagedTree, change.path);
    });
};

export const restoreWorkingChanges = (stagedTree: TreeState, workingTree: TreeState, groupIds: string[]) => {
  const selected = new Set(groupIds);
  getUnstagedChanges(stagedTree, workingTree)
    .filter((change) => selected.has(change.groupId))
    .forEach((change) => {
      copyPathState(stagedTree, workingTree, change.path);
    });
};
