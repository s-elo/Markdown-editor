import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/store';
import type { WorkspaceDescriptor } from '@markdown-editor/github-workspace';

import { DEFAULT_IGNORE_DIRS, GITHUB_WORKSPACE_CONFIG_STORAGE_KEY, WORKSPACE_MODE_STORAGE_KEY } from '@/constants';

export type WorkspaceMode = 'github' | 'local';
export interface GitHubWorkspaceConfig extends WorkspaceDescriptor {
  ignoreDirs: string[];
}

interface GitHubWorkspaceState {
  mode: WorkspaceMode;
  config: GitHubWorkspaceConfig;
}

export const emptyConfig: GitHubWorkspaceConfig = {
  owner: '',
  repo: '',
  branch: '',
  docsRoot: 'docs',
  ignoreDirs: [...DEFAULT_IGNORE_DIRS],
};

const readMode = (): WorkspaceMode =>
  window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY) === 'github' ? 'github' : 'local';

const readConfig = (): GitHubWorkspaceConfig => {
  try {
    const storedConfig = window.localStorage.getItem(GITHUB_WORKSPACE_CONFIG_STORAGE_KEY);
    if (!storedConfig) return emptyConfig;
    const parsed = JSON.parse(storedConfig) as Partial<GitHubWorkspaceConfig>;
    return {
      owner: parsed.owner ?? '',
      repo: parsed.repo ?? '',
      branch: parsed.branch ?? '',
      docsRoot: parsed.docsRoot ?? 'docs',
      ignoreDirs: Array.isArray(parsed.ignoreDirs)
        ? parsed.ignoreDirs.filter((value): value is string => typeof value === 'string')
        : [...DEFAULT_IGNORE_DIRS],
    };
  } catch {
    return emptyConfig;
  }
};

export const getGitHubWorkspaceKey = (config: WorkspaceDescriptor) =>
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
      window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, action.payload);
    },
    setGitHubWorkspaceConfig: (state, action: PayloadAction<GitHubWorkspaceConfig>) => {
      state.config = action.payload;
      window.localStorage.setItem(GITHUB_WORKSPACE_CONFIG_STORAGE_KEY, JSON.stringify(action.payload));
    },
  },
});

export const { setGitHubWorkspaceConfig, setWorkspaceMode } = githubWorkspaceSlice.actions;
export const selectGithubWorkspace = (state: RootState) => state.githubWorkspace;
export const selectWorkspaceMode = (state: RootState) => state.githubWorkspace.mode;
export const selectGitHubWorkspaceConfig = (state: RootState) => state.githubWorkspace.config;

export default githubWorkspaceSlice.reducer;
