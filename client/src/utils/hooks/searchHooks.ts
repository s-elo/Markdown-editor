import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { FileContentMatches, FileNameMatch } from '@/redux-api/searchApi';

import { useLazySearchGitHubCodeQuery, useListGitHubRepositoriesQuery } from '@/redux-api/github';
import { useLazySearchContentQuery, useLazySearchFilesQuery } from '@/redux-api/searchApi';
import { selectGithubWorkspace } from '@/redux-feature/githubWorkspaceSlice';
import { getRepositoryDocPath } from '@/utils/githubWorkspace';
import { githubWorkspaceStore } from '@/utils/githubWorkspaceRuntime';
import { useGitHubDirectoryLoader } from '@/utils/hooks/workspaceHooks';
import { mergeGitHubContentResults, searchGitHubFileNames } from '@/utils/workspaceSearch';

export type WorkspaceSearchMode = 'content' | 'files';

export interface WorkspaceSearchRequest {
  query: string;
  mode: WorkspaceSearchMode;
  caseSensitive?: boolean;
  includeFiles?: string;
  excludeFiles?: string;
  page?: number;
}

export interface WorkspaceSearchResponse {
  fileResults: FileNameMatch[];
  contentResults: FileContentMatches[];
  documentOnlyContent: boolean;
  incompleteResults: boolean;
  totalCount?: number;
  nextPage?: number;
}

export const useGitHubSearchAvailability = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const isGitHubMode = workspace.mode === 'github';
  const repositoryConfigured = Boolean(workspace.config.owner && workspace.config.repo);
  const repositoriesQuery = useListGitHubRepositoriesQuery(undefined, {
    skip: !isGitHubMode || !repositoryConfigured,
    refetchOnMountOrArgChange: true,
  });
  const repository = repositoriesQuery.data?.find(
    (item) => item.owner === workspace.config.owner && item.name === workspace.config.repo,
  );

  return useMemo(() => {
    if (!isGitHubMode) return { supported: true, isChecking: false };
    if (!repositoryConfigured) {
      return { supported: false, isChecking: false, reason: 'Select a GitHub repository in Settings to search.' };
    }
    if (repositoriesQuery.isFetching || (!repositoriesQuery.isSuccess && !repositoriesQuery.isError)) {
      return { supported: false, isChecking: true, reason: 'Checking the repository default branch…' };
    }
    if (repositoriesQuery.isError) {
      const error = repositoriesQuery.error as { message?: string } | undefined;
      return {
        supported: false,
        isChecking: false,
        reason: error?.message ?? 'Could not determine the repository default branch.',
      };
    }
    if (!repository) {
      return {
        supported: false,
        isChecking: false,
        reason: `The GitHub App cannot access ${workspace.config.owner}/${workspace.config.repo}.`,
      };
    }
    if (workspace.config.branch !== repository.defaultBranch) {
      return {
        supported: false,
        isChecking: false,
        defaultBranch: repository.defaultBranch,
        reason: `GitHub search only supports the default branch “${repository.defaultBranch}”. The current branch is “${workspace.config.branch}”.`,
      };
    }
    return { supported: true, isChecking: false, defaultBranch: repository.defaultBranch };
  }, [isGitHubMode, repository, repositoryConfigured, repositoriesQuery, workspace.config]);
};

export const useWorkspaceSearch = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [searchLocalFiles] = useLazySearchFilesQuery();
  const [searchLocalContent] = useLazySearchContentQuery();
  const [searchGitHubCode] = useLazySearchGitHubCodeQuery();
  const { loadDirectoryTree } = useGitHubDirectoryLoader();

  return useCallback(
    async ({ query, mode, caseSensitive, includeFiles, excludeFiles, page = 1 }: WorkspaceSearchRequest) => {
      if (workspace.mode === 'local') {
        if (mode === 'files') {
          return {
            fileResults: (await searchLocalFiles(query).unwrap()) ?? [],
            contentResults: [],
            documentOnlyContent: false,
            incompleteResults: false,
          } satisfies WorkspaceSearchResponse;
        }
        return {
          fileResults: [],
          contentResults:
            (await searchLocalContent({
              q: query,
              caseSensitive,
              includeFiles,
              excludeFiles,
            }).unwrap()) ?? [],
          documentOnlyContent: false,
          incompleteResults: false,
        } satisfies WorkspaceSearchResponse;
      }

      if (mode === 'files') {
        await loadDirectoryTree(getRepositoryDocPath(workspace.config, '', false));
        return {
          fileResults: searchGitHubFileNames(workspace.config, githubWorkspaceStore.getSnapshot().entries, query),
          contentResults: [],
          documentOnlyContent: false,
          incompleteResults: false,
        } satisfies WorkspaceSearchResponse;
      }

      const remotePage = await searchGitHubCode({
        owner: workspace.config.owner,
        repo: workspace.config.repo,
        docsRoot: workspace.config.docsRoot,
        query,
        page,
      }).unwrap();
      return {
        fileResults: mergeGitHubContentResults(
          workspace.config,
          githubWorkspaceStore.getSnapshot(),
          remotePage.items,
          query,
          includeFiles,
          excludeFiles,
        ),
        contentResults: [],
        documentOnlyContent: true,
        incompleteResults: remotePage.incompleteResults,
        totalCount: remotePage.totalCount,
        nextPage: remotePage.nextPage,
      } satisfies WorkspaceSearchResponse;
    },
    [loadDirectoryTree, searchGitHubCode, searchLocalContent, searchLocalFiles, workspace],
  );
};
