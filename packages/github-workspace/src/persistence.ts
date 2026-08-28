import { DATABASE_VERSION, WORKSPACE_SCHEMA_VERSION } from './constants';
import { cloneTree, getStagedChanges, getWorkingChanges } from './git-status';

import type {
  IndexedDbWorkspacePersistenceOptions,
  PersistedWorkspace,
  TreeState,
  WorkspaceConventions,
  WorkspaceDescriptor,
  WorkspacePersistence,
} from './types';

interface PersistedWorkspaceInput {
  descriptor: WorkspaceDescriptor;
  baseCommitSha: string;
  baseTreeSha: string;
  base: TreeState;
  index: TreeState;
  working: TreeState;
  revision: number;
  remoteStale: boolean;
  conventions: WorkspaceConventions;
}

export const createPersistedWorkspace = (input: PersistedWorkspaceInput): PersistedWorkspace => ({
  schemaVersion: WORKSPACE_SCHEMA_VERSION,
  descriptor: { ...input.descriptor },
  baseCommitSha: input.baseCommitSha,
  baseTreeSha: input.baseTreeSha,
  base: cloneTree(input.base),
  workingChanges: getWorkingChanges(input.index, input.working, input.conventions),
  stagedChanges: getStagedChanges(input.base, input.index, input.conventions),
  revision: input.revision,
  remoteStale: input.remoteStale,
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
