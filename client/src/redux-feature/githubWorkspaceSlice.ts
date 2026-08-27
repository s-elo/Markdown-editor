import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/store';
import type { WorkspaceDescriptor } from '@markdown-editor/github-workspace';

export type WorkspaceMode = 'github' | 'local';
export type GitHubWorkspaceConfig = WorkspaceDescriptor;

interface GitHubWorkspaceState {
  mode: WorkspaceMode;
  config: GitHubWorkspaceConfig;
}

export const emptyConfig: GitHubWorkspaceConfig = {
  owner: '',
  repo: '',
  branch: '',
  docsRoot: 'docs',
};

const MODE_STORAGE_KEY = 'workspace-mode';
const CONFIG_STORAGE_KEY = 'github-workspace-config';

const readMode = (): WorkspaceMode => (window.localStorage.getItem(MODE_STORAGE_KEY) === 'github' ? 'github' : 'local');

const readConfig = (): GitHubWorkspaceConfig => {
  try {
    const value = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!value) return emptyConfig;
    const parsed = JSON.parse(value) as Partial<GitHubWorkspaceConfig>;
    return {
      owner: parsed.owner ?? '',
      repo: parsed.repo ?? '',
      branch: parsed.branch ?? '',
      docsRoot: parsed.docsRoot ?? 'docs',
    };
  } catch {
    return emptyConfig;
  }
};

export const getGitHubWorkspaceKey = (config: GitHubWorkspaceConfig) =>
  [config.owner, config.repo, config.branch, config.docsRoot].join('/');

const initialState: GitHubWorkspaceState = {
  mode: readMode(),
  config: readConfig(),
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
      state.config = action.payload;
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(action.payload));
    },
  },
});

export const { setGitHubWorkspaceConfig, setWorkspaceMode } = githubWorkspaceSlice.actions;
export const selectGithubWorkspace = (state: RootState) => state.githubWorkspace;
export const selectWorkspaceMode = (state: RootState) => state.githubWorkspace.mode;
export const selectGitHubWorkspaceConfig = (state: RootState) => state.githubWorkspace.config;

export default githubWorkspaceSlice.reducer;
