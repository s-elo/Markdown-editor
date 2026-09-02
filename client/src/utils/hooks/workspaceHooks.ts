/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { QueryStatus, skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useGetGitHubBlobQuery, useLazyGetGitHubDirectoryQuery, useLoadGitHubWorkspaceQuery } from '@/redux-api/github';
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

const getParentRepositoryPath = (path: string) => path.split('/').filter(Boolean).slice(0, -1).join('/');

const useGitHubDirectoryLoader = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [getDirectoryPage] = useLazyGetGitHubDirectoryQuery();

  const loadDirectory = useCallback(
    async (repositoryPath: string) => {
      if (workspace.mode !== 'github') return;
      const request = githubWorkspaceStore.getDirectoryLoadRequest(repositoryPath);
      if (!request) return;
      const page = await getDirectoryPage(
        { owner: workspace.config.owner, repo: workspace.config.repo, ...request },
        true,
      ).unwrap();
      await githubWorkspaceStore.attachRemoteDirectory(page);
    },
    [getDirectoryPage, workspace.config.owner, workspace.config.repo, workspace.mode],
  );

  const loadDirectoryTree = useCallback(
    async (repositoryPath: string) => {
      const queue = [repositoryPath];
      const visited = new Set<string>();
      while (queue.length) {
        const path = queue.shift()!;
        if (visited.has(path)) continue;
        visited.add(path);
        await loadDirectory(path);
        githubWorkspaceStore
          .listDirectory(path)
          .filter((entry) => entry.kind === 'directory')
          .forEach((entry) => queue.push(entry.path));
      }
    },
    [loadDirectory],
  );

  const loadDirectoryPath = useCallback(
    async (repositoryPath: string) => {
      const workspaceRoot = getRepositoryDocPath(workspace.config, '', false);
      const relativePath = repositoryPath.slice(workspaceRoot.length).split('/').filter(Boolean);
      let currentPath = workspaceRoot;

      await loadDirectory(currentPath);
      for (const segment of relativePath) {
        currentPath = [currentPath, segment].filter(Boolean).join('/');
        await loadDirectory(currentPath);
      }
    },
    [loadDirectory, workspace.config],
  );

  return { loadDirectory, loadDirectoryPath, loadDirectoryTree };
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
  const { loadDirectory } = useGitHubDirectoryLoader();
  const trigger = useCallback(
    async (params: { folderDocPath?: string } = {}) => {
      if (workspace.mode === 'local') return localTrigger(params);
      try {
        const repositoryPath = getRepositoryDocPath(workspace.config, params.folderDocPath ?? '', false);
        await loadDirectory(repositoryPath);
        return {
          data: listGitHubSubItems(workspace.config, params.folderDocPath),
          status: QueryStatus.fulfilled,
        };
      } catch (error) {
        return {
          data: [],
          error,
          status: QueryStatus.rejected,
        };
      }
    },
    [loadDirectory, localTrigger, workspace.config, workspace.mode],
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
  const { loadDirectoryPath } = useGitHubDirectoryLoader();

  // Local documents can be queried directly. GitHub documents are discovered through the
  // lazily populated workspace tree, so their parent directories may need loading first.
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
  const parentRepositoryPath = getParentRepositoryPath(repositoryPath);
  const source = githubWorkspaceStore.getFileSource(repositoryPath);

  // Once the file entry is known, unchanged remote files load by blob SHA while locally
  // modified files already expose their content through the workspace store.
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

  // On a fresh IndexedDB workspace only the repository root is available. Resolve each
  // directory in the requested path before treating an absent file entry as deleted.
  // Including the base commit in the key forces a fresh lookup after a remote refresh.
  const resolutionKey = `${githubDocumentKey}:${snapshot.baseCommitSha}`;
  const [pathResolution, setPathResolution] = useState<{
    error?: unknown;
    key: string;
    status: 'loading' | 'resolved';
  }>();
  const canResolvePath =
    workspace.mode === 'github' &&
    activeWorkspace &&
    snapshot.persistenceLoaded &&
    Boolean(snapshot.baseCommitSha) &&
    !source &&
    !cachedGithubArticle;

  useEffect(() => {
    if (!canResolvePath) return;

    let cancelled = false;
    setPathResolution({ key: resolutionKey, status: 'loading' });
    void loadDirectoryPath(parentRepositoryPath).then(
      () => {
        if (!cancelled) setPathResolution({ key: resolutionKey, status: 'resolved' });
      },
      (error: unknown) => {
        if (!cancelled) setPathResolution({ error, key: resolutionKey, status: 'resolved' });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [canResolvePath, loadDirectoryPath, parentRepositoryPath, resolutionKey]);

  const isResolvingPath =
    canResolvePath && (pathResolution?.key !== resolutionKey || pathResolution.status === 'loading');
  const pathResolutionError = pathResolution?.key === resolutionKey ? pathResolution.error : undefined;

  // Preserve the RTK Query contract for local workspaces and while GitHub initialization
  // is incomplete. A missing-path decision is only valid after initialization and lookup.
  if (workspace.mode === 'local') return { ...localQuery, isMissing: false };
  if (!activeWorkspace || !snapshot.persistenceLoaded || !snapshot.baseCommitSha) {
    return {
      data: undefined,
      error: workspaceQuery.error,
      isMissing: false,
      isSuccess: false,
      isFetching: !activeWorkspace || !snapshot.persistenceLoaded || !workspaceQuery.isError,
    };
  }

  // A path is genuinely missing only when all parent directories loaded successfully and
  // neither the workspace store nor the last stable render contains the requested file.
  const isMissing = !source && !cachedGithubArticle && !isResolvingPath && !pathResolutionError;
  return {
    data: displayedGithubArticle,
    error:
      source || cachedGithubArticle
        ? blobQuery.error
        : pathResolutionError ?? (isMissing ? missingDocumentError : undefined),
    isMissing,
    isSuccess: displayedGithubArticle !== undefined,
    isFetching: isResolvingPath || Boolean(source && githubArticle === undefined && blobQuery.isFetching),
  };
};

export const useCreateWorkspaceDoc = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localCreate] = useCreateDocMutation();
  const { loadDirectory } = useGitHubDirectoryLoader();
  return async (payload: CreateDocPayload): Promise<DocTreeNode> => {
    if (workspace.mode === 'local') return localCreate(payload).unwrap();
    const logicalParts = denormalizePath(payload.filePath).filter(Boolean);
    const name = validateWorkspaceName(logicalParts.at(-1) ?? '');
    logicalParts[logicalParts.length - 1] = name;
    const logicalPath = normalizePath(logicalParts);
    const repositoryPath = getRepositoryDocPath(workspace.config, logicalPath, payload.isFile);
    await loadDirectory(getParentRepositoryPath(repositoryPath));
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
  const { loadDirectoryTree } = useGitHubDirectoryLoader();
  return async (payload: DeleteDocPayload) => {
    if (workspace.mode === 'local') return localDelete(payload).unwrap();
    for (const item of payload) {
      const repositoryPath = getRepositoryDocPath(workspace.config, item.filePath, item.isFile);
      if (!item.isFile) await loadDirectoryTree(repositoryPath);
      await githubWorkspaceStore.delete(repositoryPath);
    }
  };
};

export const useCopyCutWorkspaceDocs = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const [localCopyCut] = useCopyCutDocMutation();
  const { loadDirectory, loadDirectoryTree } = useGitHubDirectoryLoader();
  return async (payload: CopyCutDocPayload, onApplied?: () => void) => {
    if (workspace.mode === 'local') {
      const result = await localCopyCut(payload).unwrap();
      onApplied?.();
      return result;
    }
    for (const item of payload) {
      const source = getRepositoryDocPath(workspace.config, item.copyCutPath, item.isFile);
      const destination = getRepositoryDocPath(workspace.config, item.pastePath, item.isFile);
      if (!item.isFile) await loadDirectoryTree(source);
      await loadDirectory(getParentRepositoryPath(destination));
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
