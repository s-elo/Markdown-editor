/* eslint-disable @typescript-eslint/no-dynamic-delete */

import { EMPTY_DIRECTORY_MARKER, WORKSPACE_SETTINGS_PATH } from './constants';
import {
  cloneEntry,
  cloneMetadata,
  copyPathState,
  createDirectoryEntry,
  getDirectoryPaths,
  getStagedChanges,
  getWorkingChanges,
} from './git-status';
import { GitMode } from './types';
import { cleanPath, createId, isSameOrDescendant, makeMetadata, parentPath } from './utils';

import type { ChangeMetadata, TreeState, WorkspaceDescriptor, WorkspaceEntry } from './types';

export const assertInScope = (descriptor: WorkspaceDescriptor | null, path: string) => {
  if (!descriptor) throw new Error('No GitHub workspace is open.');
  const clean = cleanPath(path);
  const segments = clean.split('/');
  if (!clean || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Workspace paths cannot be empty or contain traversal segments.');
  }
  const root = cleanPath(descriptor.docsRoot);
  if (root && !clean.startsWith(`${root}/`)) throw new Error(`${path} is outside the configured docs root.`);
  if (!root && clean === WORKSPACE_SETTINGS_PATH) {
    throw new Error(`${WORKSPACE_SETTINGS_PATH} is managed by the workspace and cannot be changed here.`);
  }
};

const assertAvailable = (tree: TreeState, path: string) => {
  if (tree.entries[path] || Object.keys(tree.entries).some((entryPath) => isSameOrDescendant(entryPath, path))) {
    throw new Error(`${path} already exists.`);
  }
};

const ensureParents = (tree: TreeState, descriptor: WorkspaceDescriptor, path: string, metadata?: ChangeMetadata) => {
  const root = cleanPath(descriptor.docsRoot);
  getDirectoryPaths(path, root).forEach((directory) => {
    tree.entries[directory] ??= { ...createDirectoryEntry(directory), metadata };
  });
};

const removeParentMarker = (tree: TreeState, path: string, metadata: ChangeMetadata) => {
  const marker = `${parentPath(path)}/${EMPTY_DIRECTORY_MARKER}`.replace(/^\//, '');
  if (!tree.entries[marker]) return;
  delete tree.entries[marker];
  tree.deletedMetadata[marker] = metadata;
};

const ensureEmptyDirectoryMarker = (tree: TreeState, directory: string, metadata: ChangeMetadata) => {
  if (!directory || !tree.entries[directory] || tree.entries[directory].kind !== 'directory') return;
  const hasChild = Object.values(tree.entries).some(
    (entry) => parentPath(entry.path) === directory && entry.path !== `${directory}/${EMPTY_DIRECTORY_MARKER}`,
  );
  const marker = `${directory}/${EMPTY_DIRECTORY_MARKER}`;
  if (!hasChild && !tree.entries[marker]) {
    tree.entries[marker] = {
      id: createId(),
      path: marker,
      kind: 'file',
      mode: GitMode.File,
      type: 'blob',
      content: '',
      metadata,
    };
  }
};

export const listDirectoryEntries = (tree: TreeState, path: string) => {
  const directory = cleanPath(path);
  return Object.values(tree.entries)
    .filter((entry) => parentPath(entry.path) === directory && entry.path.split('/').at(-1) !== EMPTY_DIRECTORY_MARKER)
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
  metadata: ChangeMetadata,
) => {
  assertAvailable(tree, path);
  ensureParents(tree, descriptor, path, metadata);
  removeParentMarker(tree, path, metadata);
  tree.entries[path] = {
    id: createId(),
    path,
    kind: 'file',
    mode: GitMode.File,
    type: 'blob',
    content,
    metadata,
  };
};

export const createDirectory = (
  tree: TreeState,
  descriptor: WorkspaceDescriptor,
  path: string,
  metadata: ChangeMetadata,
) => {
  assertAvailable(tree, path);
  ensureParents(tree, descriptor, `${path}/child`, metadata);
  tree.entries[path] = { ...createDirectoryEntry(path), id: createId(), metadata };
  tree.entries[`${path}/${EMPTY_DIRECTORY_MARKER}`] = {
    id: createId(),
    path: `${path}/${EMPTY_DIRECTORY_MARKER}`,
    kind: 'file',
    mode: GitMode.File,
    type: 'blob',
    content: '',
    metadata,
  };
  removeParentMarker(tree, path, metadata);
};

export const writeFileEntry = (tree: TreeState, path: string, content: string, metadata: ChangeMetadata) => {
  const entry = tree.entries[path];
  if (!entry || entry.kind !== 'file') throw new Error(`The file ${path} does not exist.`);
  entry.content = content;
  entry.metadata = metadata;
};

export const deleteWorkspaceEntry = (tree: TreeState, base: TreeState, path: string, metadata: ChangeMetadata) => {
  const targets = Object.keys(tree.entries).filter((entryPath) => isSameOrDescendant(entryPath, path));
  if (!targets.length) throw new Error(`${path} does not exist.`);
  targets.forEach((target) => {
    const origin = Object.values(base.entries).find((entry) => entry.id === tree.entries[target]?.id);
    delete tree.entries[target];
    tree.deletedMetadata[target] = metadata;
    if (origin) tree.deletedMetadata[origin.path] = metadata;
  });
  ensureEmptyDirectoryMarker(tree, parentPath(path), metadata);
};

export const getTransferMetadata = (
  working: TreeState,
  index: TreeState,
  source: string,
  destination: string,
  isCopy: boolean,
) => {
  const existing = working.entries[source];
  if (!existing) throw new Error(`${source} does not exist.`);
  const inheritedMetadata = !isCopy && existing.metadata && !index.entries[source] ? existing.metadata : undefined;
  const metadata =
    inheritedMetadata ?? makeMetadata(`${isCopy ? 'Copy' : 'Move'} ${source} to ${destination}`, [source, destination]);
  metadata.label = inheritedMetadata
    ? `${existing.kind === 'file' ? 'Create file' : 'Create folder'} ${destination}`
    : metadata.label;
  metadata.scopePaths = [source, destination];
  return { existing, metadata };
};

export const transferWorkspaceEntry = (
  tree: TreeState,
  descriptor: WorkspaceDescriptor,
  aliases: Map<string, string>,
  existing: WorkspaceEntry,
  source: string,
  destination: string,
  isCopy: boolean,
  metadata: ChangeMetadata,
) => {
  if (existing.kind === 'directory' && isSameOrDescendant(destination, source)) {
    throw new Error('A directory cannot be moved or copied into itself.');
  }
  assertAvailable(tree, destination);
  const targets = Object.values(tree.entries).filter((entry) => isSameOrDescendant(entry.path, source));
  ensureParents(tree, descriptor, `${destination}/child`, metadata);
  targets.forEach((entry) => {
    const destinationPath = entry.path === source ? destination : `${destination}${entry.path.slice(source.length)}`;
    tree.entries[destinationPath] = {
      ...cloneEntry(entry),
      id: isCopy ? createId() : entry.id,
      path: destinationPath,
      metadata,
    };
    delete tree.deletedMetadata[destinationPath];
    if (!isCopy) {
      delete tree.entries[entry.path];
      tree.deletedMetadata[entry.path] = metadata;
      aliases.set(entry.path, destinationPath);
    }
  });
  removeParentMarker(tree, destination, metadata);
  if (!isCopy) ensureEmptyDirectoryMarker(tree, parentPath(source), metadata);
};

export const stageChanges = (base: TreeState, index: TreeState, working: TreeState, groupIds: string[]) => {
  const selected = new Set(groupIds);
  getWorkingChanges(index, working)
    .filter((change) => selected.has(change.groupId))
    .forEach((change) => {
      copyPathState(working, index, change.path);
      if (!change.newEntry && change.oldEntry) {
        const origin = Object.values(base.entries).find((entry) => entry.id === change.oldEntry?.id);
        if (origin) index.deletedMetadata[origin.path] = cloneMetadata(change);
      }
    });
};

export const unstageChanges = (base: TreeState, index: TreeState, groupIds: string[]) => {
  const selected = new Set(groupIds);
  getStagedChanges(base, index)
    .filter((change) => selected.has(change.groupId))
    .forEach((change) => {
      copyPathState(base, index, change.path);
    });
};

export const restoreWorkingChanges = (index: TreeState, working: TreeState, groupIds: string[]) => {
  const selected = new Set(groupIds);
  getWorkingChanges(index, working)
    .filter((change) => selected.has(change.groupId))
    .forEach((change) => {
      copyPathState(index, working, change.path);
    });
};
