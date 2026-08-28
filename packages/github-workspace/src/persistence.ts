import { DATABASE_VERSION, WORKSPACE_SCHEMA_VERSION } from './constants';
import { cloneTree, getLocalDirectories, getStagedChanges, getUnstagedChanges } from './git-status';

import type {
  IndexedDbWorkspacePersistenceOptions,
  PersistedWorkspace,
  TreeState,
  WorkspaceDescriptor,
  WorkspacePersistence,
} from './types';

interface PersistedWorkspaceInput {
  descriptor: WorkspaceDescriptor;
  baseCommitSha: string;
  baseTreeSha: string;
  baseTree: TreeState;
  stagedTree: TreeState;
  workingTree: TreeState;
  workspaceVersion: number;
}

export const createPersistedWorkspace = (input: PersistedWorkspaceInput): PersistedWorkspace => ({
  schemaVersion: WORKSPACE_SCHEMA_VERSION,
  descriptor: { ...input.descriptor },
  baseCommitSha: input.baseCommitSha,
  baseTreeSha: input.baseTreeSha,
  baseTree: cloneTree(input.baseTree),
  unstagedChanges: getUnstagedChanges(input.stagedTree, input.workingTree),
  stagedChanges: getStagedChanges(input.baseTree, input.stagedTree),
  localDirectories: getLocalDirectories(input.workingTree),
  workspaceVersion: input.workspaceVersion,
});

const openDatabase = async ({ databaseName, storeName }: IndexedDbWorkspacePersistenceOptions): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, DATABASE_VERSION);
    request.onerror = () => {
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
  });

export class IndexedDbWorkspacePersistence implements WorkspacePersistence {
  public constructor(private readonly options: IndexedDbWorkspacePersistenceOptions) {}

  public async read(key: string): Promise<PersistedWorkspace | null> {
    const database = await openDatabase(this.options);
    return new Promise<PersistedWorkspace | null>((resolve, reject) => {
      const request = database
        .transaction(this.options.storeName, 'readonly')
        .objectStore(this.options.storeName)
        .get(key);
      request.onerror = () => {
        reject(request.error);
      };
      request.onsuccess = () => {
        resolve((request.result as PersistedWorkspace | undefined) ?? null);
      };
    }).finally(() => {
      database.close();
    });
  }

  public async write(key: string, value: PersistedWorkspace): Promise<void> {
    const database = await openDatabase(this.options);
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.options.storeName, 'readwrite');
      transaction.onerror = () => {
        reject(transaction.error);
      };
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.objectStore(this.options.storeName).put(value, key);
    }).finally(() => {
      database.close();
    });
  }
}
