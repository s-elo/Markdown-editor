/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { EMPTY_DIRECTORY_MARKER } from './constants';
import { GitMode } from './types';
import { cleanPath, makeMetadata, parentPath } from './utils';

import type {
  ChangeMetadata,
  PathMapping,
  RemoteTreeEntry,
  TreeState,
  WorkspaceChange,
  WorkspaceDescriptor,
  WorkspaceEntry,
  WorkspaceStatus,
  PublishTreeEntry,
} from './types';

export const emptyTree = (): TreeState => ({ entries: {}, deletedMetadata: {} });

export const cloneEntry = (entry: WorkspaceEntry): WorkspaceEntry => ({
  ...entry,
  metadata: entry.metadata ? { ...entry.metadata, scopePaths: [...entry.metadata.scopePaths] } : undefined,
});

export const cloneMetadata = (metadata: ChangeMetadata): ChangeMetadata => ({
  groupId: metadata.groupId,
  label: metadata.label,
  scopePaths: [...metadata.scopePaths],
});

export const cloneTree = (tree: TreeState): TreeState => ({
  entries: Object.fromEntries(Object.entries(tree.entries).map(([path, entry]) => [path, cloneEntry(entry)])),
  deletedMetadata: Object.fromEntries(
    Object.entries(tree.deletedMetadata).map(([path, metadata]) => [
      path,
      { ...metadata, scopePaths: [...metadata.scopePaths] },
    ]),
  ),
});

export const createDirectoryEntry = (path: string): WorkspaceEntry => ({
  id: `directory:${path}`,
  path,
  kind: 'directory',
  mode: GitMode.Directory,
  type: 'tree',
});

export const getDirectoryPaths = (path: string, root: string) => {
  const parts = path.split('/').filter(Boolean);
  const rootLength = root ? root.split('/').filter(Boolean).length : 0;
  return parts.slice(0, -1).reduce<string[]>((directories, _, index) => {
    const directory = parts.slice(0, index + 1).join('/');
    if (index + 1 > rootLength) directories.push(directory);
    return directories;
  }, []);
};

export const createBaseTree = (descriptor: WorkspaceDescriptor, entries: RemoteTreeEntry[]): TreeState => {
  const root = cleanPath(descriptor.docsRoot);
  const tree = emptyTree();
  entries.forEach((entry) => {
    if (root && entry.path !== root && !entry.path.startsWith(`${root}/`)) return;
    getDirectoryPaths(entry.path, root).forEach((directory) => {
      tree.entries[directory] ??= createDirectoryEntry(directory);
    });
    tree.entries[entry.path] = {
      id: `base:${entry.path}`,
      path: entry.path,
      kind: 'file',
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
      size: entry.size,
    };
  });
  return tree;
};

const sameEntry = (left?: WorkspaceEntry, right?: WorkspaceEntry) =>
  Boolean(
    left &&
      right &&
      left.kind === right.kind &&
      left.mode === right.mode &&
      left.type === right.type &&
      left.sha === right.sha &&
      left.content === right.content,
  );

const entryMetadata = (tree: TreeState, path: string, entry?: WorkspaceEntry) =>
  entry?.metadata ?? tree.deletedMetadata[path];

const isEmptyDirectory = (tree: TreeState, path: string) =>
  !Object.values(tree.entries).some(
    (entry) => parentPath(entry.path) === path && entry.path !== `${path}/${EMPTY_DIRECTORY_MARKER}`,
  );

export const treeToGitStatus = (
  from: TreeState,
  to: TreeState,
  addedStatus: 'ADDED' | 'UNTRACKED',
): WorkspaceChange[] => {
  const paths = new Set([...Object.keys(from.entries), ...Object.keys(to.entries)]);
  return [...paths]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((path) => {
      const oldEntry = from.entries[path];
      const newEntry = to.entries[path];
      if (sameEntry(oldEntry, newEntry)) return [];
      // Directories are a UI concept rather than Git tree leaves. Only empty-directory changes need their own status.
      if (
        (newEntry?.kind === 'directory' && !oldEntry && !isEmptyDirectory(to, path)) ||
        (oldEntry?.kind === 'directory' && !newEntry && !isEmptyDirectory(from, path))
      ) {
        return [];
      }
      const metadata =
        entryMetadata(to, path, newEntry) ?? makeMetadata(`${newEntry ? 'Update' : 'Delete'} ${path}`, [path]);
      const status: WorkspaceStatus = !oldEntry ? addedStatus : !newEntry ? 'DELETED' : 'MODIFIED';
      return [
        {
          id: `${status}:${path}`,
          groupId: metadata.groupId,
          label: metadata.label,
          status,
          path,
          kind: (newEntry ?? oldEntry).kind,
          oldEntry: oldEntry ? cloneEntry(oldEntry) : null,
          newEntry: newEntry ? cloneEntry(newEntry) : null,
          scopePaths: [...metadata.scopePaths],
        },
      ];
    });
};

export const getWorkingChanges = (index: TreeState, working: TreeState) => treeToGitStatus(index, working, 'UNTRACKED');

export const getStagedChanges = (base: TreeState, index: TreeState) => treeToGitStatus(base, index, 'ADDED');

export const gitStatusToTree = (base: TreeState, changes: WorkspaceChange[], root = '') => {
  const result = cloneTree(base);
  changes.forEach((change) => {
    if (change.newEntry) {
      result.entries[change.path] = cloneEntry(change.newEntry);
      delete result.deletedMetadata[change.path];
    } else {
      delete result.entries[change.path];
      result.deletedMetadata[change.path] = cloneMetadata(change);
    }
  });
  Object.values(result.entries)
    .filter((entry) => entry.kind === 'file')
    .forEach((entry) => {
      getDirectoryPaths(entry.path, cleanPath(root)).forEach((path) => {
        result.entries[path] ??= {
          ...createDirectoryEntry(path),
          metadata: entry.metadata ? cloneMetadata(entry.metadata) : undefined,
        };
      });
    });
  Object.values(result.entries)
    .filter((entry) => entry.kind === 'directory')
    .forEach((entry) => {
      const hasDescendant = Object.keys(result.entries).some((path) => path.startsWith(`${entry.path}/`));
      if (!hasDescendant) delete result.entries[entry.path];
    });
  return result;
};

export const stagedChangesToPublishEntries = (base: TreeState, index: TreeState, root = ''): PublishTreeEntry[] =>
  treeToGitStatus(base, gitStatusToTree(base, getStagedChanges(base, index), root), 'ADDED')
    .filter((change) => change.kind === 'file')
    .map((change) => {
      if (!change.newEntry) {
        return {
          path: change.path,
          mode: change.oldEntry?.mode ?? GitMode.File,
          type: change.oldEntry?.type === 'commit' ? 'commit' : 'blob',
          sha: null,
        };
      }
      return {
        path: change.path,
        mode: change.newEntry.mode,
        type: change.newEntry.type === 'commit' ? 'commit' : 'blob',
        sha: change.newEntry.content === undefined ? change.newEntry.sha ?? null : null,
        content: change.newEntry.content,
      };
    });

export const changedPaths = (left: TreeState, right: TreeState) =>
  treeToGitStatus(left, right, 'ADDED').map((change) => change.path);

export const copyPathState = (source: TreeState, destination: TreeState, path: string) => {
  const entry = source.entries[path];
  if (entry) destination.entries[path] = cloneEntry(entry);
  else delete destination.entries[path];
  const metadata = source.deletedMetadata[path];
  if (metadata) destination.deletedMetadata[path] = { ...metadata, scopePaths: [...metadata.scopePaths] };
  else delete destination.deletedMetadata[path];
};

export const applyGitStatusToTree = (from: TreeState, desired: TreeState, onto: TreeState, root = '') => {
  return gitStatusToTree(onto, treeToGitStatus(from, desired, 'ADDED'), root);
};

export const getPathMappings = (before: TreeState, after: TreeState) => {
  const beforeById = new Map(Object.values(before.entries).map((entry) => [entry.id, entry]));
  return Object.values(after.entries).flatMap<PathMapping>((entry) => {
    const previous = beforeById.get(entry.id);
    return previous && previous.path !== entry.path
      ? [{ oldPath: previous.path, newPath: entry.path, kind: entry.kind }]
      : [];
  });
};
