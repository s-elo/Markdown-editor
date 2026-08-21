/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { PersistedGitHubWorkspace } from '@/redux-feature/githubWorkspaceSlice';

const DATABASE_NAME = 'markdown-editor-github-workspaces';
const STORE_NAME = 'workspaces';
const DATABASE_VERSION = 1;

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
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
  });

export const readGitHubWorkspace = async (key: string): Promise<PersistedGitHubWorkspace | null> => {
  const database = await openDatabase();
  return new Promise<PersistedGitHubWorkspace | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onerror = () => {
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve((request.result as PersistedGitHubWorkspace | undefined) ?? null);
    };
  }).finally(() => {
    database.close();
  });
};

export const writeGitHubWorkspace = async (key: string, value: PersistedGitHubWorkspace): Promise<void> => {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.onerror = () => {
      reject(transaction.error);
    };
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.objectStore(STORE_NAME).put(value, key);
  }).finally(() => {
    database.close();
  });
};
