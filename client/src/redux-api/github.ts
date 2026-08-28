/* eslint-disable @typescript-eslint/init-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { GitMode } from '@markdown-editor/github-workspace';
import { Octokit } from '@octokit/rest';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type { GitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import type {
  PublishPlan,
  PublishTreeEntry,
  RemoteWorkspaceSnapshot,
  WorkspaceDescriptor,
} from '@markdown-editor/github-workspace';

import { DEFAULT_IGNORE_DIRS, GITHUB_WORKSPACE_EMPTY_DIRECTORY_MARKER, WORKSPACE_SETTINGS_PATH } from '@/constants';
import { getGitHubAccessToken } from '@/utils/hooks/githubAuthHooks';

export interface GitHubRepositoryOption {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export type GitHubWorkspaceSnapshot = RemoteWorkspaceSnapshot;

export interface CreateGitHubRepositoryPayload {
  name: string;
  description?: string;
  private: boolean;
  docsRoot: string;
}

export interface PublishGitHubWorkspacePayload {
  config: WorkspaceDescriptor;
  plan: PublishPlan;
  title: string;
  body: string;
}

export interface GitHubWorkspaceSettings {
  docsRoot: string;
  ignoreDirs: string[];
  schemaVersion: number;
}

let octokitToken = '';
let octokitClient: Octokit | null = null;

const getOctokit = () => {
  const token = getGitHubAccessToken();
  if (!token) throw new Error('Sign in to GitHub to use this workspace.');
  if (!octokitClient || octokitToken !== token) {
    octokitToken = token;
    octokitClient = new Octokit({ auth: token, userAgent: 'markdown-editor' });
  }
  return octokitClient;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'GitHub request failed.';
};

const getSnapshot = async (
  config: Pick<WorkspaceDescriptor, 'branch' | 'owner' | 'repo'>,
): Promise<GitHubWorkspaceSnapshot> => {
  const octokit = getOctokit();
  const refResponse = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
    owner: config.owner,
    repo: config.repo,
    ref: `heads/${config.branch}`,
  });
  const commitSha = refResponse.data.object.sha;
  const commitResponse = await octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
    owner: config.owner,
    repo: config.repo,
    commit_sha: commitSha,
  });
  const treeSha = commitResponse.data.tree.sha;
  const treeResponse = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
    owner: config.owner,
    repo: config.repo,
    tree_sha: treeSha,
    recursive: '1',
  });
  if (treeResponse.data.truncated) {
    throw new Error('This repository tree is too large to load safely in GitHub workspace mode.');
  }

  const entries = treeResponse.data.tree
    .filter((entry) => entry.path && entry.mode && entry.type && entry.sha && entry.type !== 'tree')
    .map((entry) => ({
      path: entry.path,
      mode: entry.mode as GitMode,
      type: entry.type as RemoteWorkspaceSnapshot['entries'][number]['type'],
      sha: entry.sha,
      size: entry.size,
    }));
  return { baseCommitSha: commitSha, baseTreeSha: treeSha, entries };
};

interface CommitTreeOptions {
  baseCommitSha: string;
  baseTreeSha: string;
  config: Pick<WorkspaceDescriptor, 'branch' | 'owner' | 'repo'>;
  entries: PublishTreeEntry[];
  message: string;
}

/**
 * Writes a set of file changes as one commit and advances the configured branch.
 * Entry content creates a new blob, an existing SHA is reused, and a null SHA without content deletes the path.
 */
const commitTreeToBranch = async ({ baseCommitSha, baseTreeSha, config, entries, message }: CommitTreeOptions) => {
  const octokit = getOctokit();
  // Materialize new content as blobs while preserving existing blobs and deletion markers.
  const treeEntries = await Promise.all(
    entries.map(async (entry) => {
      if (entry.content === undefined) {
        if (entry.sha === null) return { path: entry.path, mode: entry.mode, type: entry.type, sha: null };
        if (!entry.sha) throw new Error(`No content is available for ${entry.path}.`);
        return { path: entry.path, mode: entry.mode, type: entry.type, sha: entry.sha };
      }
      const blob = await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
        owner: config.owner,
        repo: config.repo,
        content: entry.content,
        encoding: 'utf-8',
      });
      return { path: entry.path, mode: entry.mode, type: entry.type, sha: blob.data.sha };
    }),
  );
  // Apply the resolved entries to the base tree, then create a commit on top of the expected parent.
  const tree = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
    owner: config.owner,
    repo: config.repo,
    base_tree: baseTreeSha,
    tree: treeEntries,
  });
  const commit = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
    owner: config.owner,
    repo: config.repo,
    message,
    tree: tree.data.sha,
    parents: [baseCommitSha],
  });
  // Move the branch only when GitHub can perform a non-forced update.
  await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
    owner: config.owner,
    repo: config.repo,
    ref: `heads/${config.branch}`,
    sha: commit.data.sha,
    force: false,
  });
};

const initializeWorkspace = async (
  config: Pick<GitHubWorkspaceConfig, 'branch' | 'docsRoot' | 'ignoreDirs' | 'owner' | 'repo'>,
): Promise<GitHubWorkspaceSnapshot> => {
  const octokit = getOctokit();
  const docsRoot = config.docsRoot.replace(/^\/+|\/+$/g, '');
  const settingsContent = `${JSON.stringify({ schemaVersion: 1, docsRoot, ignoreDirs: config.ignoreDirs }, null, 2)}\n`;
  let snapshot: GitHubWorkspaceSnapshot;
  let isInitializing: boolean;
  try {
    snapshot = await getSnapshot(config);
    isInitializing = !snapshot.entries.some((entry) => entry.path === WORKSPACE_SETTINGS_PATH);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404 && status !== 409) throw error;
    isInitializing = true;
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: config.owner,
      repo: config.repo,
      path: WORKSPACE_SETTINGS_PATH,
      message: 'Initialize Markdown Editor workspace',
      content: window.btoa(settingsContent),
    });
    snapshot = await getSnapshot(config);
  }
  await commitTreeToBranch({
    config,
    baseCommitSha: snapshot.baseCommitSha,
    baseTreeSha: snapshot.baseTreeSha,
    entries: [
      {
        path: WORKSPACE_SETTINGS_PATH,
        mode: GitMode.File,
        type: 'blob',
        sha: null,
        content: settingsContent,
      },
      ...(docsRoot
        ? [
            {
              path: `${docsRoot}/${GITHUB_WORKSPACE_EMPTY_DIRECTORY_MARKER}`,
              mode: GitMode.File,
              type: 'blob' as const,
              sha: null,
              content: '',
            },
          ]
        : []),
    ],
    message: `${isInitializing ? 'Initialize' : 'Update'} Markdown Editor workspace`,
  });
  return getSnapshot(config);
};

const decodeBase64Utf8 = (content: string) => {
  const binary = window.atob(content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const listAccessibleGitHubRepositories = async (): Promise<GitHubRepositoryOption[]> => {
  const octokit = getOctokit();
  const installations = await octokit.paginate('GET /user/installations', { per_page: 100 });
  const repositoryPages = await Promise.all(
    installations
      .filter((installation) => installation.permissions.contents === 'write')
      .map(async (installation) =>
        octokit.paginate('GET /user/installations/{installation_id}/repositories', {
          installation_id: installation.id,
          per_page: 100,
        }),
      ),
  );
  const repositories = [...new Map(repositoryPages.flat().map((repository) => [repository.id, repository])).values()];
  return repositories
    .filter((repository) => repository.permissions?.push || repository.permissions?.admin)
    .map((repository) => ({
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      defaultBranch: repository.default_branch,
      private: repository.private,
    }));
};

export const githubApi = createApi({
  reducerPath: 'githubApi',
  baseQuery: fakeBaseQuery<{ message: string }>(),
  tagTypes: ['Branches', 'Repositories', 'Workspace'],
  endpoints: (builder) => ({
    listGitHubRepositories: builder.query<GitHubRepositoryOption[], void>({
      queryFn: async () => {
        try {
          return { data: await listAccessibleGitHubRepositories() };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
      providesTags: ['Repositories'],
    }),
    listGitHubBranches: builder.query<string[], { owner: string; repo: string }>({
      queryFn: async ({ owner, repo }) => {
        try {
          const octokit = getOctokit();
          const branches = await octokit.paginate(octokit.rest.repos.listBranches, { owner, repo, per_page: 100 });
          return { data: branches.map((branch) => branch.name) };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
      providesTags: ['Branches'],
    }),
    getGitHubWorkspaceSettings: builder.query<
      GitHubWorkspaceSettings | null,
      { owner: string; repo: string; branch: string }
    >({
      queryFn: async ({ owner, repo, branch }) => {
        try {
          const response = await getOctokit().rest.repos.getContent({
            owner,
            repo,
            path: WORKSPACE_SETTINGS_PATH,
            ref: branch,
          });
          if (Array.isArray(response.data) || response.data.type !== 'file' || !('content' in response.data)) {
            return { data: null };
          }
          const value = JSON.parse(decodeBase64Utf8(response.data.content)) as {
            docsRoot?: unknown;
            ignoreDirs?: unknown;
            schemaVersion?: unknown;
          };
          if (value.schemaVersion !== 1 || typeof value.docsRoot !== 'string') return { data: null };
          if (
            value.ignoreDirs !== undefined &&
            (!Array.isArray(value.ignoreDirs) || value.ignoreDirs.some((item) => typeof item !== 'string'))
          ) {
            return { data: null };
          }
          return {
            data: {
              schemaVersion: 1,
              docsRoot: value.docsRoot,
              ignoreDirs: value.ignoreDirs === undefined ? [...DEFAULT_IGNORE_DIRS] : (value.ignoreDirs as string[]),
            },
          };
        } catch (error) {
          if ((error as { status?: number }).status === 404) return { data: null };
          return { error: { message: getErrorMessage(error) } };
        }
      },
    }),
    loadGitHubWorkspace: builder.query<GitHubWorkspaceSnapshot, WorkspaceDescriptor>({
      queryFn: async (config) => {
        try {
          return { data: await getSnapshot(config) };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
      providesTags: ['Workspace'],
    }),
    getGitHubBlob: builder.query<string, { owner: string; repo: string; sha: string }>({
      queryFn: async ({ owner, repo, sha }) => {
        try {
          const response = await getOctokit().request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
            owner,
            repo,
            file_sha: sha,
          });
          return {
            data: response.data.encoding === 'base64' ? decodeBase64Utf8(response.data.content) : response.data.content,
          };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
    }),
    createGitHubRepository: builder.mutation<
      { config: GitHubWorkspaceConfig; snapshot: GitHubWorkspaceSnapshot },
      CreateGitHubRepositoryPayload
    >({
      queryFn: async (payload) => {
        try {
          const response = await getOctokit().rest.repos.createForAuthenticatedUser({
            name: payload.name,
            description: payload.description,
            private: payload.private,
            auto_init: true,
          });
          const partialConfig = {
            owner: response.data.owner.login,
            repo: response.data.name,
            branch: response.data.default_branch,
            docsRoot: payload.docsRoot,
            ignoreDirs: [...DEFAULT_IGNORE_DIRS],
          };
          const snapshot = await initializeWorkspace(partialConfig);
          return {
            data: {
              config: partialConfig,
              snapshot,
            },
          };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
      invalidatesTags: ['Repositories'],
    }),
    initializeGitHubWorkspace: builder.mutation<GitHubWorkspaceSnapshot, GitHubWorkspaceConfig>({
      queryFn: async (config) => {
        try {
          return { data: await initializeWorkspace(config) };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
      invalidatesTags: ['Workspace'],
    }),
    publishGitHubWorkspace: builder.mutation<GitHubWorkspaceSnapshot, PublishGitHubWorkspacePayload>({
      queryFn: async ({ config, plan, title, body }) => {
        try {
          const current = await getSnapshot(config);
          if (current.baseCommitSha !== plan.baseCommitSha) {
            throw new Error(
              'The selected branch changed on GitHub. Rebase or discard local changes before publishing.',
            );
          }
          await commitTreeToBranch({
            config,
            baseCommitSha: plan.baseCommitSha,
            baseTreeSha: plan.baseTreeSha,
            entries: plan.entries,
            message: body.trim() ? `${title}\n\n${body}` : title,
          });
          return { data: await getSnapshot(config) };
        } catch (error) {
          return { error: { message: getErrorMessage(error) } };
        }
      },
      invalidatesTags: ['Workspace'],
    }),
  }),
});

export const {
  useCreateGitHubRepositoryMutation,
  useGetGitHubBlobQuery,
  useGetGitHubWorkspaceSettingsQuery,
  useInitializeGitHubWorkspaceMutation,
  useListGitHubBranchesQuery,
  useListGitHubRepositoriesQuery,
  useLoadGitHubWorkspaceQuery,
  usePublishGitHubWorkspaceMutation,
} = githubApi;
