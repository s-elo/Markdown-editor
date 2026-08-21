/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/store';

export type WorkspaceMode = 'github' | 'local';

export interface GitHubWorkspaceConfig {
  owner: string;
  repo: string;
  branch: string;
  docsRoot: string;
  /** Commit that the local workspace was read from and must still be the branch head when publishing. */
  baseCommitSha: string;
  /** Root tree for baseCommitSha; staged changes are applied against this tree to create one new Git tree. */
  baseTreeSha: string;
}

/** Metadata for one tracked path in the remote base tree. File contents are fetched lazily by blob SHA. */
export interface GitHubTreeEntry {
  path: string;
  mode: '040000' | '100644' | '100755' | '120000' | '160000';
  type: 'blob' | 'commit' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubOverlayEntry {
  /** Repository-relative path, including docsRoot and the .md extension for documents. */
  path: string;
  /** `upsert` adds/replaces this path; `delete` removes it from the effective or published tree. */
  action: 'delete' | 'upsert';
  mode: GitHubTreeEntry['mode'];
  type: 'blob' | 'commit';
  sha?: string;
  /** Present for new/edited text; absent when an existing remote blob SHA can be reused. */
  content?: string;
  /** All entries in one logical operation share an ID so directory operations are staged atomically. */
  operationId: string;
  /** Human-readable summary shown by the Working/Staged lists; it is metadata and does not drive publishing. */
  label: string;
  /** Source/destination roots used only to detect overlap when rebasing onto a newer remote commit. */
  scopePaths?: string[];
}

/**
 * The IndexedDB record for one owner/repo/branch/docsRoot workspace.
 *
 * Tree model:
 * - `baseEntries` is the immutable manifest at config.baseCommitSha.
 * - `working` is a path-keyed overlay used by the menu and editor. An upsert replaces/adds a base path and a delete
 *   hides it, so the visible tree is `baseEntries + working`.
 * - `staged` is a snapshot copied from working. Staging does not remove the working entry, which means a later edit
 *   can remain in working while the older staged snapshot is published.
 * - Publishing applies only staged entries to config.baseTreeSha, creates one commit, advances the branch once, and
 *   replaces the base manifest. A working entry is cleared only when it still matches the published staged snapshot.
 *
 * A store listener writes this object to IndexedDB after tree/overlay mutations. The active mode and workspace config
 * are also kept in localStorage so startup can select a workspace before its full IndexedDB record is hydrated.
 *
 * Important: this is a net tree overlay, not an executable queue of GitHub API calls. Publishing sends the staged
 * paths together in one Git tree. `operationId` only groups related path changes for the UI/staging boundary; GitHub
 * never receives the create/update/move labels or the order in which the user performed those actions.
 */
export interface PersistedGitHubWorkspace {
  config: GitHubWorkspaceConfig;
  baseEntries: Record<string, GitHubTreeEntry>;
  working: Record<string, GitHubOverlayEntry>;
  staged: Record<string, GitHubOverlayEntry>;
  remoteStale: boolean;
}

interface GitHubWorkspaceState extends PersistedGitHubWorkspace {
  /** UI/backend selection; persisted separately in localStorage, not in each IndexedDB workspace record. */
  mode: WorkspaceMode;
  /** Workspace key whose IndexedDB record has finished loading; empty while hydration is pending. */
  hydratedKey: string;
}

export const emptyConfig: GitHubWorkspaceConfig = {
  owner: '',
  repo: '',
  branch: '',
  docsRoot: 'docs',
  baseCommitSha: '',
  baseTreeSha: '',
};

const MODE_STORAGE_KEY = 'workspace-mode';
const CONFIG_STORAGE_KEY = 'github-workspace-config';

const readMode = (): WorkspaceMode => (window.localStorage.getItem(MODE_STORAGE_KEY) === 'github' ? 'github' : 'local');

const readConfig = (): GitHubWorkspaceConfig => {
  try {
    const value = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    return value ? (JSON.parse(value) as GitHubWorkspaceConfig) : emptyConfig;
  } catch {
    return emptyConfig;
  }
};

export const getGitHubWorkspaceKey = (config: Pick<GitHubWorkspaceConfig, 'branch' | 'docsRoot' | 'owner' | 'repo'>) =>
  [config.owner, config.repo, config.branch, config.docsRoot].join('/');

const initialState: GitHubWorkspaceState = {
  mode: readMode(),
  config: readConfig(),
  baseEntries: {},
  working: {},
  staged: {},
  hydratedKey: '',
  remoteStale: false,
};

const githubWorkspaceSlice = createSlice({
  name: 'githubWorkspace',
  initialState,
  reducers: {
    setWorkspaceMode: (state, action: PayloadAction<WorkspaceMode>) => {
      state.mode = action.payload;
      window.localStorage.setItem(MODE_STORAGE_KEY, action.payload);
    },
    setGitHubWorkspaceConfig: (state, action: PayloadAction<GitHubWorkspaceConfig>) => {
      // Point at the new workspace immediately, then let useGitHubWorkspaceSync hydrate its keyed IndexedDB record.
      state.config = action.payload;
      state.hydratedKey = '';
      state.baseEntries = {};
      state.working = {};
      state.staged = {};
      state.remoteStale = false;
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(action.payload));
    },
    hydrateGitHubWorkspace: (state, action: PayloadAction<PersistedGitHubWorkspace | null>) => {
      const key = getGitHubWorkspaceKey(state.config);
      if (action.payload && getGitHubWorkspaceKey(action.payload.config) === key) {
        state.config = action.payload.config;
        state.baseEntries = action.payload.baseEntries;
        state.working = action.payload.working;
        state.staged = action.payload.staged;
        state.remoteStale = action.payload.remoteStale;
      } else {
        // The commit SHA stored in localStorage is only a workspace hint. Do not
        // treat it as a loaded manifest when IndexedDB has no matching snapshot.
        state.config.baseCommitSha = '';
        state.config.baseTreeSha = '';
        state.baseEntries = {};
        state.working = {};
        state.staged = {};
        state.remoteStale = false;
      }
      state.hydratedKey = key;
    },
    syncRemoteWorkspace: (
      state,
      action: PayloadAction<{ baseCommitSha: string; baseTreeSha: string; entries: GitHubTreeEntry[] }>,
    ) => {
      const hasPendingChanges = Object.keys(state.working).length > 0 || Object.keys(state.staged).length > 0;
      if (
        hasPendingChanges &&
        state.config.baseCommitSha &&
        state.config.baseCommitSha !== action.payload.baseCommitSha
      ) {
        state.remoteStale = true;
        return;
      }

      state.config.baseCommitSha = action.payload.baseCommitSha;
      state.config.baseTreeSha = action.payload.baseTreeSha;
      state.baseEntries = Object.fromEntries(action.payload.entries.map((entry) => [entry.path, entry]));
      state.remoteStale = false;
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.config));
    },
    applyWorkingEntries: (state, action: PayloadAction<GitHubOverlayEntry[]>) => {
      // The overlay is keyed by repository path, so the newest mutation for a path becomes its desired state. A
      // delete of a path created only in this workspace cancels that creation completely instead of retaining a
      // meaningless create-then-delete pair. Callers preserve an existing operationId when a save refines an
      // unstaged create/update/move; staged snapshots must not be rewritten.
      action.payload.forEach((entry) => {
        if (
          entry.action === 'delete' &&
          !state.baseEntries[entry.path] &&
          state.working[entry.path]?.action === 'upsert' &&
          !state.staged[entry.path]
        ) {
          delete state.working[entry.path];
          return;
        }
        state.working[entry.path] = entry;
      });
    },
    stageOperations: (state, action: PayloadAction<string[]>) => {
      // Copy complete operation groups. Keep working intact: it is still the effective tree seen by the editor. If a
      // later edit touches a staged path, its hook assigns a new operationId so the staged snapshot stays immutable.
      const operationIds = new Set(action.payload);
      Object.values(state.working).forEach((entry) => {
        if (operationIds.has(entry.operationId)) state.staged[entry.path] = { ...entry };
      });
    },
    stageAllOperations: (state) => {
      state.staged = Object.fromEntries(Object.entries(state.working).map(([path, entry]) => [path, { ...entry }]));
    },
    unstageOperations: (state, action: PayloadAction<string[]>) => {
      // Unstaging removes only the snapshot; the corresponding working overlay remains visible and editable.
      const operationIds = new Set(action.payload);
      Object.entries(state.staged).forEach(([path, entry]) => {
        if (operationIds.has(entry.operationId)) delete state.staged[path];
      });
    },
    discardOperations: (state, action: PayloadAction<string[]>) => {
      // Discard currently removes the selected net overlay group from both views. It does not replay a chronological
      // command log; dependent-operation handling therefore belongs in the future normalized-diff model.
      const operationIds = new Set(action.payload);
      Object.entries(state.working).forEach(([path, entry]) => {
        if (operationIds.has(entry.operationId)) delete state.working[path];
      });
      Object.entries(state.staged).forEach(([path, entry]) => {
        if (operationIds.has(entry.operationId)) delete state.staged[path];
      });
    },
    discardAllChanges: (state) => {
      state.working = {};
      state.staged = {};
      state.remoteStale = false;
    },
    applyPublishedWorkspace: (
      state,
      action: PayloadAction<{ baseCommitSha: string; baseTreeSha: string; entries: GitHubTreeEntry[] }>,
    ) => {
      // Preserve edits made after staging by clearing only working entries identical to what was just published.
      Object.entries(state.staged).forEach(([path, stagedEntry]) => {
        const workingEntry = state.working[path];
        if (workingEntry && JSON.stringify(workingEntry) === JSON.stringify(stagedEntry)) delete state.working[path];
      });
      state.staged = {};
      state.config.baseCommitSha = action.payload.baseCommitSha;
      state.config.baseTreeSha = action.payload.baseTreeSha;
      state.baseEntries = Object.fromEntries(action.payload.entries.map((entry) => [entry.path, entry]));
      state.remoteStale = false;
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.config));
    },
    rebaseRemoteWorkspace: (
      state,
      action: PayloadAction<{ baseCommitSha: string; baseTreeSha: string; entries: GitHubTreeEntry[] }>,
    ) => {
      state.config.baseCommitSha = action.payload.baseCommitSha;
      state.config.baseTreeSha = action.payload.baseTreeSha;
      state.baseEntries = Object.fromEntries(action.payload.entries.map((entry) => [entry.path, entry]));
      state.remoteStale = false;
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.config));
    },
    markRemoteStale: (state, action: PayloadAction<boolean>) => {
      state.remoteStale = action.payload;
    },
  },
});

export const {
  applyPublishedWorkspace,
  applyWorkingEntries,
  discardAllChanges,
  discardOperations,
  hydrateGitHubWorkspace,
  markRemoteStale,
  rebaseRemoteWorkspace,
  setGitHubWorkspaceConfig,
  setWorkspaceMode,
  stageAllOperations,
  stageOperations,
  syncRemoteWorkspace,
  unstageOperations,
} = githubWorkspaceSlice.actions;

export const selectGithubWorkspace = (state: RootState) => state.githubWorkspace;
export const selectWorkspaceMode = (state: RootState) => state.githubWorkspace.mode;
export const selectGitHubWorkspaceConfig = (state: RootState) => state.githubWorkspace.config;

export default githubWorkspaceSlice.reducer;
