/* eslint-disable @typescript-eslint/init-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { Octokit } from '@octokit/rest';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  GitMode,
  PublishPlan,
  RemoteWorkspaceSnapshot,
  WorkspaceDescriptor,
} from '@markdown-editor/github-workspace';

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

const initializeWorkspace = async (
  config: Pick<WorkspaceDescriptor, 'branch' | 'docsRoot' | 'owner' | 'repo'>,
): Promise<GitHubWorkspaceSnapshot> => {
  const octokit = getOctokit();
  const docsRoot = config.docsRoot.replace(/^\/+|\/+$/g, '');
  const settingsContent = `${JSON.stringify({ schemaVersion: 1, docsRoot }, null, 2)}\n`;
  let snapshot: GitHubWorkspaceSnapshot;
  try {
    snapshot = await getSnapshot(config);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404 && status !== 409) throw error;
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: config.owner,
      repo: config.repo,
      path: '.workspace-settings.json',
      message: 'Initialize Markdown Editor workspace',
      content: window.btoa(settingsContent),
    });
    snapshot = await getSnapshot(config);
  }
  const settingsBlob = await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
    owner: config.owner,
    repo: config.repo,
    content: settingsContent,
    encoding: 'utf-8',
  });
  const keepBlob = docsRoot
    ? await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
        owner: config.owner,
        repo: config.repo,
        content: '',
        encoding: 'utf-8',
      })
    : null;
  const tree = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
    owner: config.owner,
    repo: config.repo,
    base_tree: snapshot.baseTreeSha,
    tree: [
      { path: '.workspace-settings.json', mode: '100644', type: 'blob', sha: settingsBlob.data.sha },
      ...(keepBlob
        ? [{ path: `${docsRoot}/.gitkeep`, mode: '100644' as const, type: 'blob' as const, sha: keepBlob.data.sha }]
        : []),
    ],
  });
  const commit = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
    owner: config.owner,
    repo: config.repo,
    message: 'Initialize Markdown Editor workspace',
    tree: tree.data.sha,
    parents: [snapshot.baseCommitSha],
  });
  await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
    owner: config.owner,
    repo: config.repo,
    ref: `heads/${config.branch}`,
    sha: commit.data.sha,
    force: false,
  });
  return getSnapshot(config);
};

const decodeBase64Utf8 = (content: string) => {
  const binary = window.atob(content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const githubApi = createApi({
  reducerPath: 'githubApi',
  baseQuery: fakeBaseQuery<{ message: string }>(),
  tagTypes: ['Branches', 'Repositories', 'Workspace'],
  endpoints: (builder) => ({
    listGitHubRepositories: builder.query<GitHubRepositoryOption[], void>({
      queryFn: async () => {
        try {
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
          const repositories = [
            ...new Map(repositoryPages.flat().map((repository) => [repository.id, repository])).values(),
          ];
          return {
            data: repositories
              .filter((repository) => repository.permissions?.push || repository.permissions?.admin)
              .map((repository) => ({
                owner: repository.owner.login,
                name: repository.name,
                fullName: repository.full_name,
                defaultBranch: repository.default_branch,
                private: repository.private,
              })),
          };
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
      { docsRoot: string; schemaVersion: number } | null,
      { owner: string; repo: string; branch: string }
    >({
      queryFn: async ({ owner, repo, branch }) => {
        try {
          const response = await getOctokit().rest.repos.getContent({
            owner,
            repo,
            path: '.workspace-settings.json',
            ref: branch,
          });
          if (Array.isArray(response.data) || response.data.type !== 'file' || !('content' in response.data)) {
            return { data: null };
          }
          const value = JSON.parse(decodeBase64Utf8(response.data.content)) as {
            docsRoot?: unknown;
            schemaVersion?: unknown;
          };
          if (value.schemaVersion !== 1 || typeof value.docsRoot !== 'string') return { data: null };
          return { data: { schemaVersion: 1, docsRoot: value.docsRoot } };
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
      { config: WorkspaceDescriptor; snapshot: GitHubWorkspaceSnapshot },
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
    initializeGitHubWorkspace: builder.mutation<GitHubWorkspaceSnapshot, WorkspaceDescriptor>({
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
          const octokit = getOctokit();
          const current = await getSnapshot(config);
          if (current.baseCommitSha !== plan.baseCommitSha) {
            throw new Error(
              'The selected branch changed on GitHub. Rebase or discard local changes before publishing.',
            );
          }

          const treeEntries = await Promise.all(
            plan.entries.map(async (entry) => {
              if (entry.sha === null && entry.content === undefined) {
                return { path: entry.path, mode: entry.mode, type: entry.type, sha: null };
              }
              let sha = entry.sha;
              if (entry.content !== undefined) {
                const blob = await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
                  owner: config.owner,
                  repo: config.repo,
                  content: entry.content,
                  encoding: 'utf-8',
                });
                sha = blob.data.sha;
              }
              if (!sha) throw new Error(`No content is available for ${entry.path}.`);
              return { path: entry.path, mode: entry.mode, type: entry.type, sha };
            }),
          );
          const tree = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
            owner: config.owner,
            repo: config.repo,
            base_tree: plan.baseTreeSha,
            tree: treeEntries,
          });
          const commit = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
            owner: config.owner,
            repo: config.repo,
            message: body.trim() ? `${title}\n\n${body}` : title,
            tree: tree.data.sha,
            parents: [plan.baseCommitSha],
          });
          await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
            owner: config.owner,
            repo: config.repo,
            ref: `heads/${config.branch}`,
            sha: commit.data.sha,
            force: false,
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
