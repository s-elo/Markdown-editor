/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { GitMode } from './types';
import { cleanPath, createOperationMetadata } from './utils';

import type {
  OperationMetadata,
  PathMapping,
  PublishTreeEntry,
  RemoteTreeEntry,
  TreeState,
  WorkspaceChange,
  WorkspaceDescriptor,
  WorkspaceEntry,
  WorkspaceStatus,
} from './types';

export const emptyTree = (): TreeState => ({ entries: {}, deletedOperationMetadata: {} });

export const cloneOperationMetadata = (operationMetadata: OperationMetadata): OperationMetadata => ({
  groupId: operationMetadata.groupId,
  label: operationMetadata.label,
  scopePaths: [...operationMetadata.scopePaths],
});

export const cloneEntry = (entry: WorkspaceEntry): WorkspaceEntry => {
  return {
    ...entry,
    operationMetadata: entry.operationMetadata ? cloneOperationMetadata(entry.operationMetadata) : undefined,
  };
};

export const cloneTree = (tree: TreeState): TreeState => ({
  entries: Object.fromEntries(Object.entries(tree.entries).map(([path, entry]) => [path, cloneEntry(entry)])),
  deletedOperationMetadata: Object.fromEntries(
    Object.entries(tree.deletedOperationMetadata).map(([path, operationMetadata]) => [
      path,
      cloneOperationMetadata(operationMetadata),
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
      kind: entry.type === 'tree' ? 'directory' : 'file',
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

const getOperationMetadata = (tree: TreeState, path: string, entry?: WorkspaceEntry) =>
  entry?.operationMetadata ?? tree.deletedOperationMetadata[path];

/** Returns file changes only. Git does not track directories. */
export const diffTrees = (from: TreeState, to: TreeState, addedStatus: 'ADDED' | 'UNTRACKED'): WorkspaceChange[] => {
  const paths = new Set([...Object.keys(from.entries), ...Object.keys(to.entries)]);
  return [...paths]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((path) => {
      const oldEntry = from.entries[path];
      const newEntry = to.entries[path];
      if (sameEntry(oldEntry, newEntry) || (newEntry ?? oldEntry)?.kind === 'directory') return [];
      const operationMetadata =
        getOperationMetadata(to, path, newEntry) ??
        createOperationMetadata(`${newEntry ? 'Update' : 'Delete'} ${path}`, [path]);
      const status: WorkspaceStatus = !oldEntry ? addedStatus : !newEntry ? 'DELETED' : 'MODIFIED';
      return [
        {
          id: `${status}:${path}`,
          groupId: operationMetadata.groupId,
          label: operationMetadata.label,
          status,
          path,
          kind: (newEntry ?? oldEntry).kind,
          oldEntry: oldEntry ? cloneEntry(oldEntry) : null,
          newEntry: newEntry ? cloneEntry(newEntry) : null,
          scopePaths: [...operationMetadata.scopePaths],
        },
      ];
    });
};

export const getUnstagedChanges = (stagedTree: TreeState, workingTree: TreeState) =>
  diffTrees(stagedTree, workingTree, 'UNTRACKED');

export const getStagedChanges = (baseTree: TreeState, stagedTree: TreeState) =>
  diffTrees(baseTree, stagedTree, 'ADDED');

/** Applies file changes and rebuilds their parent directories. */
export const applyChangesToTree = (baseTree: TreeState, changes: WorkspaceChange[], root = '') => {
  const result = cloneTree(baseTree);
  changes.forEach((change) => {
    if ((change.newEntry ?? change.oldEntry)?.kind === 'directory') return;
    if (change.newEntry) {
      const entry = cloneEntry(change.newEntry);
      entry.operationMetadata ??= cloneOperationMetadata(change);
      result.entries[change.path] = entry;
      delete result.deletedOperationMetadata[change.path];
    } else {
      delete result.entries[change.path];
      result.deletedOperationMetadata[change.path] = cloneOperationMetadata(change);
    }
  });
  Object.values(result.entries)
    .filter((entry) => entry.kind === 'file')
    .forEach((entry) => {
      getDirectoryPaths(entry.path, cleanPath(root)).forEach((path) => {
        result.entries[path] ??= createDirectoryEntry(path);
      });
    });
  Object.values(result.entries)
    .filter((entry) => entry.kind === 'directory')
    .forEach((entry) => {
      const hasDescendant = Object.keys(result.entries).some((path) => path.startsWith(`${entry.path}/`));
      if (!hasDescendant && !entry.sha && !entry.operationMetadata) delete result.entries[entry.path];
    });
  return result;
};

/** Keeps explicit empty folders in browser storage without adding them to Git. */
export const getLocalDirectories = (tree: TreeState) =>
  Object.values(tree.entries)
    .filter(
      (entry) =>
        entry.kind === 'directory' &&
        Boolean(entry.operationMetadata) &&
        !Object.keys(tree.entries).some((path) => path.startsWith(`${entry.path}/`)),
    )
    .map(cloneEntry);

export const restoreLocalDirectories = (tree: TreeState, directories: WorkspaceEntry[], root = '') => {
  directories.forEach((entry) => {
    if (entry.kind !== 'directory' || tree.entries[entry.path]) return;
    getDirectoryPaths(`${entry.path}/child`, cleanPath(root)).forEach((path) => {
      tree.entries[path] ??= path === entry.path ? cloneEntry(entry) : createDirectoryEntry(path);
    });
  });
};

export const getPublishEntries = (baseTree: TreeState, stagedTree: TreeState): PublishTreeEntry[] =>
  getStagedChanges(baseTree, stagedTree).map((change) => {
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

export const copyPathState = (source: TreeState, destination: TreeState, path: string) => {
  const entry = source.entries[path];
  if (entry) destination.entries[path] = cloneEntry(entry);
  else delete destination.entries[path];
  const operationMetadata = source.deletedOperationMetadata[path];
  if (operationMetadata) {
    destination.deletedOperationMetadata[path] = cloneOperationMetadata(operationMetadata);
  } else {
    delete destination.deletedOperationMetadata[path];
  }
};

export const replayChangesOntoTree = (from: TreeState, desired: TreeState, onto: TreeState, root: string) =>
  applyChangesToTree(onto, diffTrees(from, desired, 'ADDED'), root);

export const getPathMappings = (before: TreeState, after: TreeState) => {
  const beforeById = new Map(Object.values(before.entries).map((entry) => [entry.id, entry]));
  return Object.values(after.entries).flatMap<PathMapping>((entry) => {
    const previous = beforeById.get(entry.id);
    return previous && previous.path !== entry.path
      ? [{ oldPath: previous.path, newPath: entry.path, kind: entry.kind }]
      : [];
  });
};
