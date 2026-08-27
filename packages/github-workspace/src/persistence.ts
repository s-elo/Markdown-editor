import { DATABASE_NAME, DATABASE_VERSION, WORKSPACE_SCHEMA_VERSION, WORKSPACE_STORE_NAME } from './constants';
import { cloneTree, getStagedChanges, getWorkingChanges } from './git-status';

import type { PersistedWorkspace, TreeState, WorkspaceDescriptor, WorkspacePersistence } from './types';

interface PersistedWorkspaceInput {
  descriptor: WorkspaceDescriptor;
  baseCommitSha: string;
  baseTreeSha: string;
  base: TreeState;
  index: TreeState;
  working: TreeState;
  revision: number;
  remoteStale: boolean;
}

export const createPersistedWorkspace = (input: PersistedWorkspaceInput): PersistedWorkspace => ({
  schemaVersion: WORKSPACE_SCHEMA_VERSION,
  descriptor: { ...input.descriptor },
  baseCommitSha: input.baseCommitSha,
  baseTreeSha: input.baseTreeSha,
  base: cloneTree(input.base),
  workingChanges: getWorkingChanges(input.index, input.working),
  stagedChanges: getStagedChanges(input.base, input.index),
  revision: input.revision,
  remoteStale: input.remoteStale,
});

const openDatabase = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => {
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WORKSPACE_STORE_NAME)) {
        request.result.createObjectStore(WORKSPACE_STORE_NAME);
      }
    };
  });

export class IndexedDbWorkspacePersistence implements WorkspacePersistence {
  public async read(key: string): Promise<PersistedWorkspace | null> {
    const database = await openDatabase();
    return new Promise<PersistedWorkspace | null>((resolve, reject) => {
      const request = database.transaction(WORKSPACE_STORE_NAME, 'readonly').objectStore(WORKSPACE_STORE_NAME).get(key);
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
    const database = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(WORKSPACE_STORE_NAME, 'readwrite');
      transaction.onerror = () => {
        reject(transaction.error);
      };
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.objectStore(WORKSPACE_STORE_NAME).put(value, key);
    }).finally(() => {
      database.close();
    });
  }
}
