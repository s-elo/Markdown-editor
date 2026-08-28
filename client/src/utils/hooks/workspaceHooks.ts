/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { QueryStatus, skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';

import type {
  Article,
  CopyCutDocPayload,
  CreateDocPayload,
  DeleteDocPayload,
  DocTreeNode,
  ModifyDocNamePayload,
  UpdateDocPayload,
} from '@/redux-api/docsApiType';
import type { RootState } from '@/store';
import type { WorkspaceEntry } from '@markdown-editor/github-workspace';

import {
  useCopyCutDocMutation,
  useCreateDocMutation,
  useDeleteDocMutation,
  useGetDocQuery,
  useGetDocSubItemsQuery,
  useLazyGetDocSubItemsQuery,
  useModifyDocNameMutation,
  useUpdateDocMutation,
} from '@/redux-api/docs';
import { useGetGitHubBlobQuery, useLoadGitHubWorkspaceQuery } from '@/redux-api/github';
import {
  getGitHubWorkspaceKey,
  selectGithubWorkspace,
  type GitHubWorkspaceConfig,
} from '@/redux-feature/githubWorkspaceSlice';
import { getRepositoryDocPath, getVisibleLogicalPath, validateWorkspaceName } from '@/utils/githubWorkspace';
import { githubWorkspaceStore, useGitHubWorkspaceSnapshot } from '@/utils/githubWorkspaceRuntime';
import { useGitHubAccessToken } from '@/utils/hooks/githubAuthHooks';
import { denormalizePath, normalizePath } from '@/utils/utils';

const MARKDOWN_EXTENSION_LENGTH = 3;

const isConfigured = (config: GitHubWorkspaceConfig) => Boolean(config.owner && config.repo && config.branch);

const isHiddenMenuEntry = (config: GitHubWorkspaceConfig, entry: WorkspaceEntry) => {
  const name = entry.path.split('/').at(-1) ?? '';
  return name === '_assets' || name.startsWith('.') || (entry.kind === 'directory' && config.ignoreDirs.includes(name));
};

const toDocTreeNode = (config: GitHubWorkspaceConfig, entry: WorkspaceEntry): DocTreeNode | null => {
  if (isHiddenMenuEntry(config, entry)) return null;
  const name = entry.path.split('/').at(-1) ?? '';
  if (entry.kind === 'file' && !name.endsWith('.md')) return null;
  const logicalPath = getVisibleLogicalPath(config, entry.path);
  const path = denormalizePath(logicalPath);
  return {
    id: entry.id,
    name: entry.kind === 'file' ? name.slice(0, -MARKDOWN_EXTENSION_LENGTH) : name,
    isFile: entry.kind === 'file',
    path,
  };
};

const listGitHubSubItems = (config: GitHubWorkspaceConfig, logicalFolderPath = '') => {
  const repositoryPath = getRepositoryDocPath(config, logicalFolderPath, false);
  return githubWorkspaceStore
    .listDirectory(repositoryPath)
    .map((entry) => toDocTreeNode(config, entry))
    .filter((entry): entry is DocTreeNode => Boolean(entry));
};

/** Activates the keyed package store, then attaches the RTK-fetched remote manifest. */
export const useGitHubWorkspaceSync = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const githubAccessToken = useGitHubAccessToken();
  const snapshot = useGitHubWorkspaceSnapshot();
  const configured = isConfigured(workspace.config);
  const activeWorkspace = snapshot.descriptor
    ? getGitHubWorkspaceKey(snapshot.descriptor) === getGitHubWorkspaceKey(workspace.config)
    : false;

  useEffect(() => {
    if (workspace.mode !== 'github' || !configured || !githubAccessToken) {
      githubWorkspaceStore.close();
      return;
    }
    void githubWorkspaceStore.open(workspace.config);
  }, [configured, githubAccessToken, workspace.config, workspace.mode]);

  const query = useLoadGitHubWorkspaceQuery(
    workspace.mode === 'github' && configured && githubAccessToken && activeWorkspace && snapshot.persistenceLoaded
      ? workspace.config
      : skipToken,
    { refetchOnMountOrArgChange: true },
  );

  useEffect(() => {
    if (githubAccessToken && query.data) void githubWorkspaceStore.attachRemote(query.data);
  }, [githubAccessToken, query.data]);

  return query;
};

export const useWorkspaceRootItemsQuery = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const githubAccessToken = useGitHubAccessToken();
  const snapshot = useGitHubWorkspaceSnapshot();
  const localQuery = useGetDocSubItemsQuery(undefined, {
    skip: workspace.mode === 'github',
    refetchOnMountOrArgChange: true,
  });
  const configured = isConfigured(workspace.config);
  const activeWorkspace = snapshot.descriptor
    ? getGitHubWorkspaceKey(snapshot.descriptor) === getGitHubWorkspaceKey(workspace.config)
    : false;
  const githubQuery = useLoadGitHubWorkspaceQuery(
    workspace.mode === 'github' && configured && githubAccessToken && activeWorkspace && snapshot.persistenceLoaded
      ? workspace.config
      : skipToken,
    { refetchOnMountOrArgChange: true },
  );
  const data = useMemo(
    () =>
      workspace.mode === 'github' && githubAccessToken && activeWorkspace && snapshot.persistenceLoaded
        ? listGitHubSubItems(workspace.config)
        : [],
    [
      activeWorkspace,
      githubAccessToken,
      snapshot.workspaceVersion,
      snapshot.persistenceLoaded,
      workspace.config,
      workspace.mode,
    ],
  );
  if (workspace.mode === 'local') {
    return {
      ...localQuery,
      // refresh menu if changed
      dataVersion: localQuery.fulfilledTimeStamp ?? 0,
    };
  }
  if (!githubAccessToken) {
    return {
      data: [],
      dataVersion: 0,
      error: { message: 'Sign in to GitHub to use this workspace.' },
      isError: true,
      isFetching: false,
      isSuccess: false,
      refetch: async () => ({ data: [] }),
    };
  }
  return {
    data,
    dataVersion: snapshot.workspaceVersion,
    error: githubQuery.error,
    isError: githubQuery.isError,
    isFetching:
      githubQuery.isFetching ||
      (configured &&
        (!activeWorkspace || !snapshot.persistenceLoaded || !snapshot.baseCommitSha) &&
        !githubQuery.isError),
    isSuccess: (activeWorkspace && snapshot.persistenceLoaded && Boolean(snapshot.baseCommitSha)) || !configured,
    refetch: async () => ({ data }),
  };
};

export const useLazyWorkspaceSubItemsQuery = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localTrigger] = useLazyGetDocSubItemsQuery();
  const trigger = useCallback(
    async (params: { folderDocPath?: string } = {}) => {
      if (workspace.mode === 'local') return localTrigger(params);
      return {
        data: listGitHubSubItems(workspace.config, params.folderDocPath),
        status: QueryStatus.fulfilled,
      };
    },
    [localTrigger, workspace.config, workspace.mode],
  );
  return [trigger] as const;
};

const getDefaultArticle = (path: string, content: string): Article => ({
  content,
  filePath: path,
  headings: [],
  keywords: [],
});

export const useWorkspaceDocQuery = (logicalPath: string) => {
  const workspace = useSelector(selectGithubWorkspace);
  const snapshot = useGitHubWorkspaceSnapshot();
  const localQuery = useGetDocQuery(logicalPath, { skip: workspace.mode === 'github' });
  const configured = isConfigured(workspace.config);
  const activeWorkspace = snapshot.descriptor
    ? getGitHubWorkspaceKey(snapshot.descriptor) === getGitHubWorkspaceKey(workspace.config)
    : false;
  const workspaceQuery = useLoadGitHubWorkspaceQuery(
    workspace.mode === 'github' && configured && activeWorkspace && snapshot.persistenceLoaded
      ? workspace.config
      : skipToken,
  );
  const repositoryPath = getRepositoryDocPath(workspace.config, logicalPath, true);
  const source = githubWorkspaceStore.getFileSource(repositoryPath);
  const blobQuery = useGetGitHubBlobQuery(
    workspace.mode === 'github' && source?.kind === 'remote' && source.sha
      ? { owner: workspace.config.owner, repo: workspace.config.repo, sha: source.sha }
      : skipToken,
  );
  const githubContent = source?.kind === 'remote' ? blobQuery.currentData : source?.content;
  const githubArticle = useMemo(
    () => (githubContent === undefined ? undefined : getDefaultArticle(logicalPath, githubContent)),
    [githubContent, logicalPath],
  );
  const githubDocumentKey = `${getGitHubWorkspaceKey(workspace.config)}:${logicalPath}`;
  const lastLoadedGithubArticleRef = useRef<{ key: string; article: Article } | undefined>(undefined);
  if (githubArticle) lastLoadedGithubArticleRef.current = { key: githubDocumentKey, article: githubArticle };
  const cachedGithubArticle =
    lastLoadedGithubArticleRef.current?.key === githubDocumentKey
      ? lastLoadedGithubArticleRef.current.article
      : undefined;
  // Keep the last loaded document while a file operation updates its tab or route.
  const displayedGithubArticle = githubArticle ?? cachedGithubArticle;
  const missingDocumentError = useMemo(() => new Error(`The file ${logicalPath} does not exist.`), [logicalPath]);

  if (workspace.mode === 'local') return localQuery;
  if (!activeWorkspace || !snapshot.persistenceLoaded || !snapshot.baseCommitSha) {
    return {
      data: undefined,
      error: workspaceQuery.error,
      isSuccess: false,
      isFetching: !activeWorkspace || !snapshot.persistenceLoaded || !workspaceQuery.isError,
    };
  }
  return {
    data: displayedGithubArticle,
    error: source || cachedGithubArticle ? blobQuery.error : missingDocumentError,
    isSuccess: displayedGithubArticle !== undefined,
    isFetching: Boolean(source && githubArticle === undefined && blobQuery.isFetching),
  };
};

export const useCreateWorkspaceDoc = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localCreate] = useCreateDocMutation();
  return async (payload: CreateDocPayload): Promise<DocTreeNode> => {
    if (workspace.mode === 'local') return localCreate(payload).unwrap();
    const logicalParts = denormalizePath(payload.filePath).filter(Boolean);
    const name = validateWorkspaceName(logicalParts.at(-1) ?? '');
    logicalParts[logicalParts.length - 1] = name;
    const logicalPath = normalizePath(logicalParts);
    const repositoryPath = getRepositoryDocPath(workspace.config, logicalPath, payload.isFile);
    if (payload.isFile) await githubWorkspaceStore.createFile(repositoryPath);
    else await githubWorkspaceStore.createDirectory(repositoryPath);
    return { id: `github-${logicalParts.join('-')}`, name, isFile: payload.isFile, path: logicalParts };
  };
};

export const useUpdateWorkspaceDoc = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localUpdate] = useUpdateDocMutation();
  return async (payload: UpdateDocPayload) => {
    if (workspace.mode === 'local') return localUpdate(payload).unwrap();
    await githubWorkspaceStore.writeFile(
      getRepositoryDocPath(workspace.config, payload.filePath, true),
      payload.content,
    );
  };
};

export const useDeleteWorkspaceDocs = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localDelete] = useDeleteDocMutation();
  return async (payload: DeleteDocPayload) => {
    if (workspace.mode === 'local') return localDelete(payload).unwrap();
    for (const item of payload) {
      await githubWorkspaceStore.delete(getRepositoryDocPath(workspace.config, item.filePath, item.isFile));
    }
  };
};

export const useCopyCutWorkspaceDocs = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localCopyCut] = useCopyCutDocMutation();
  return async (payload: CopyCutDocPayload, onApplied?: () => void) => {
    if (workspace.mode === 'local') {
      const result = await localCopyCut(payload).unwrap();
      onApplied?.();
      return result;
    }
    for (const item of payload) {
      const source = getRepositoryDocPath(workspace.config, item.copyCutPath, item.isFile);
      const destination = getRepositoryDocPath(workspace.config, item.pastePath, item.isFile);
      if (item.isCopy) await githubWorkspaceStore.copy(source, destination);
      else await githubWorkspaceStore.move(source, destination);
    }
    onApplied?.();
  };
};

export const useRenameWorkspaceDoc = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localRename] = useModifyDocNameMutation();
  const copyCut = useCopyCutWorkspaceDocs();
  return async (payload: ModifyDocNamePayload, onApplied?: () => void) => {
    if (workspace.mode === 'local') {
      const result = await localRename(payload).unwrap();
      onApplied?.();
      return result;
    }
    const pathParts = denormalizePath(payload.filePath);
    const name = validateWorkspaceName(payload.name);
    const newPath = normalizePath([...pathParts.slice(0, -1), name]);
    return copyCut(
      [{ copyCutPath: payload.filePath, pastePath: newPath, isCopy: false, isFile: payload.isFile }],
      onApplied,
    );
  };
};

export const selectGithubWorkspaceKey = (state: RootState) => getGitHubWorkspaceKey(state.githubWorkspace.config);
