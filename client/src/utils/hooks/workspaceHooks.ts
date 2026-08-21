/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/require-await */
import { QueryStatus, skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';

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
  applyWorkingEntries,
  getGitHubWorkspaceKey,
  hydrateGitHubWorkspace,
  selectGithubWorkspace,
  syncRemoteWorkspace,
  type GitHubOverlayEntry,
} from '@/redux-feature/githubWorkspaceSlice';
import {
  createOperationId,
  getEffectiveGitHubEntries,
  getGitHubSubItems,
  getRepositoryDocPath,
  validateWorkspaceName,
} from '@/utils/githubWorkspace';
import { readGitHubWorkspace } from '@/utils/githubWorkspaceDb';
import { denormalizePath, normalizePath } from '@/utils/utils';

// Kept as a single adapter boundary so local components never need to know which backend is active.
export const useGitHubWorkspaceSync = () => {
  const dispatch = useDispatch();
  const workspace = useSelector(selectGithubWorkspace);
  const key = getGitHubWorkspaceKey(workspace.config);
  const configured = Boolean(workspace.config.owner && workspace.config.repo && workspace.config.branch);

  useEffect(() => {
    if (workspace.mode !== 'github' || !configured || workspace.hydratedKey === key) return;
    let active = true;
    void readGitHubWorkspace(key)
      .then((persisted) => {
        if (active) dispatch(hydrateGitHubWorkspace(persisted));
      })
      .catch(() => {
        if (active) dispatch(hydrateGitHubWorkspace(null));
      });
    return () => {
      active = false;
    };
  }, [configured, dispatch, key, workspace.hydratedKey, workspace.mode]);

  const query = useLoadGitHubWorkspaceQuery(
    workspace.mode === 'github' && configured && workspace.hydratedKey === key ? workspace.config : skipToken,
  );

  useEffect(() => {
    if (query.data) dispatch(syncRemoteWorkspace(query.data));
  }, [dispatch, query.data]);

  return query;
};

export const useWorkspaceRootItemsQuery = () => {
  const workspace = useSelector(selectGithubWorkspace);
  const localQuery = useGetDocSubItemsQuery(undefined, {
    skip: workspace.mode === 'github',
    refetchOnMountOrArgChange: true,
  });
  const key = getGitHubWorkspaceKey(workspace.config);
  const configured = Boolean(workspace.config.owner && workspace.config.repo && workspace.config.branch);
  const githubQuery = useLoadGitHubWorkspaceQuery(
    workspace.mode === 'github' && configured && workspace.hydratedKey === key ? workspace.config : skipToken,
  );
  const data = useMemo(() => getGitHubSubItems(workspace), [workspace]);
  if (workspace.mode === 'local') return localQuery;
  const ready = Boolean(workspace.hydratedKey && workspace.config.baseCommitSha);
  return {
    data,
    error: githubQuery.error,
    isError: githubQuery.isError,
    isFetching: configured && !ready && githubQuery.isFetching,
    isSuccess: ready || !configured,
    refetch: async () => ({ data }),
  };
};

export const useLazyWorkspaceSubItemsQuery = () => {
  const store = useStore<RootState>();
  const [localTrigger] = useLazyGetDocSubItemsQuery();
  const trigger = useCallback(
    async (params: { folderDocPath?: string } = {}) => {
      // A menu mutation dispatches its overlay before asking for the refreshed children. Reading the store here,
      // rather than capturing `workspace` during render, ensures that refresh sees the just-created/moved paths.
      const workspace = store.getState().githubWorkspace;
      if (workspace.mode === 'local') return localTrigger(params);
      return {
        data: getGitHubSubItems(workspace, params.folderDocPath),
        status: QueryStatus.fulfilled,
      };
    },
    [localTrigger, store],
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
  const localQuery = useGetDocQuery(logicalPath, { skip: workspace.mode === 'github' });
  const key = getGitHubWorkspaceKey(workspace.config);
  const configured = Boolean(workspace.config.owner && workspace.config.repo && workspace.config.branch);
  const workspaceQuery = useLoadGitHubWorkspaceQuery(
    workspace.mode === 'github' && configured && workspace.hydratedKey === key ? workspace.config : skipToken,
  );
  const repositoryPath = getRepositoryDocPath(workspace.config, logicalPath, true);
  const effectiveEntry = getEffectiveGitHubEntries(workspace)[repositoryPath];
  const blobQuery = useGetGitHubBlobQuery(
    workspace.mode === 'github' && effectiveEntry?.sha && effectiveEntry.content === undefined
      ? { owner: workspace.config.owner, repo: workspace.config.repo, sha: effectiveEntry.sha }
      : skipToken,
  );
  // Overlay content wins for new/edited documents. An untouched or SHA-only moved document lazily reuses its
  // remote blob, so moving a file does not download and re-upload it merely to change its path.
  const githubContent = effectiveEntry?.content ?? blobQuery.currentData;
  const githubArticle = useMemo(
    () => (githubContent === undefined ? undefined : getDefaultArticle(logicalPath, githubContent)),
    [githubContent, logicalPath],
  );
  const missingDocumentError = useMemo(() => new Error(`The file ${logicalPath} does not exist.`), [logicalPath]);

  if (workspace.mode === 'local') return localQuery;
  const workspaceReady = workspace.hydratedKey === key && Boolean(workspace.config.baseCommitSha);
  if (!workspaceReady) {
    return {
      data: undefined,
      error: workspaceQuery.error,
      isSuccess: false,
      isFetching: !workspaceQuery.isError,
    };
  }

  return {
    data: githubArticle,
    error: effectiveEntry ? blobQuery.error : missingDocumentError,
    isSuccess: githubArticle !== undefined,
    isFetching: Boolean(effectiveEntry && githubArticle === undefined && blobQuery.isFetching),
  };
};

const createOverlay = (
  entry: Partial<GitHubOverlayEntry> & Pick<GitHubOverlayEntry, 'action' | 'label' | 'operationId' | 'path'>,
): GitHubOverlayEntry => ({ mode: '100644', type: 'blob', ...entry });

const getKeepPath = (parentPath: string) => (parentPath ? `${parentPath}/.gitkeep` : null);

/**
 * Git has files, not directories. After deletes/moves, add a `.gitkeep` only when the resulting effective tree has
 * no descendant under a parent. These marker entries belong to the same operation group as the mutation that made
 * the directory empty, and are hidden by the menu adapter.
 */
const addEmptyParentMarkers = (
  workspace: ReturnType<typeof selectGithubWorkspace>,
  overlays: GitHubOverlayEntry[],
  parentPaths: string[],
) => {
  const effective = getEffectiveGitHubEntries(workspace);
  overlays.forEach((overlay) => {
    if (overlay.action === 'delete') delete effective[overlay.path];
    else {
      effective[overlay.path] = {
        path: overlay.path,
        mode: overlay.mode,
        type: overlay.type,
        sha: overlay.sha ?? '',
        content: overlay.content,
      };
    }
  });
  parentPaths.forEach((parentPath) => {
    if (!parentPath || Object.keys(effective).some((path) => path.startsWith(`${parentPath}/`))) return;
    const operationId = overlays[0]?.operationId ?? createOperationId();
    overlays.push(
      createOverlay({
        path: `${parentPath}/.gitkeep`,
        action: 'upsert',
        content: '',
        operationId,
        label: overlays[0]?.label ?? `Keep empty folder ${parentPath}`,
      }),
    );
  });
};

export const useCreateWorkspaceDoc = () => {
  const dispatch = useDispatch();
  const workspace = useSelector(selectGithubWorkspace);
  const [localCreate] = useCreateDocMutation();
  return async (payload: CreateDocPayload): Promise<DocTreeNode> => {
    if (workspace.mode === 'local') return localCreate(payload).unwrap();

    const logicalParts = denormalizePath(payload.filePath).filter(Boolean);
    const name = validateWorkspaceName(logicalParts.at(-1) ?? '');
    logicalParts[logicalParts.length - 1] = name;
    const logicalPath = normalizePath(logicalParts);
    const repositoryPath = payload.isFile
      ? getRepositoryDocPath(workspace.config, logicalPath, true)
      : `${getRepositoryDocPath(workspace.config, logicalPath, false)}/.gitkeep`;
    if (getEffectiveGitHubEntries(workspace)[repositoryPath]) {
      throw new Error(`${logicalParts.join('/')} already exists.`);
    }
    // A file is represented directly; an empty directory exists in Git only through its hidden `.gitkeep` blob.
    const operationId = createOperationId();
    const entries: GitHubOverlayEntry[] = [
      createOverlay({
        path: repositoryPath,
        action: 'upsert',
        content: '',
        operationId,
        label: `Create ${payload.isFile ? 'file' : 'folder'} ${logicalParts.join('/')}`,
      }),
    ];
    const parentKeepPath = getKeepPath(
      getRepositoryDocPath(workspace.config, normalizePath(logicalParts.slice(0, -1)), false),
    );
    if (parentKeepPath && getEffectiveGitHubEntries(workspace)[parentKeepPath]) {
      entries.push(createOverlay({ path: parentKeepPath, action: 'delete', operationId, label: entries[0].label }));
    }
    dispatch(applyWorkingEntries(entries));
    return {
      id: `github-${logicalParts.join('-')}`,
      name,
      isFile: payload.isFile,
      path: logicalParts,
    };
  };
};

export const useUpdateWorkspaceDoc = () => {
  const dispatch = useDispatch();
  const workspace = useSelector(selectGithubWorkspace);
  const [localUpdate] = useUpdateDocMutation();
  return async (payload: UpdateDocPayload) => {
    if (workspace.mode === 'local') return localUpdate(payload).unwrap();
    const path = getRepositoryDocPath(workspace.config, payload.filePath, true);
    const current = getEffectiveGitHubEntries(workspace)[path];
    const currentWorking = workspace.working[path];
    const canMergeIntoWorkingOperation = currentWorking?.action === 'upsert' && !workspace.staged[path];
    dispatch(
      applyWorkingEntries([
        createOverlay({
          path,
          action: 'upsert',
          content: payload.content,
          sha: current?.sha,
          mode: current?.mode ?? '100644',
          type: current?.type === 'commit' ? 'commit' : 'blob',
          // Repeated saves, and edits to a newly-created/moved file, refine the existing unstaged operation. Once a
          // snapshot is staged we deliberately start a new operation so the staged content remains publishable.
          operationId: canMergeIntoWorkingOperation ? currentWorking.operationId : createOperationId(),
          label: canMergeIntoWorkingOperation
            ? currentWorking.label
            : `Update ${denormalizePath(payload.filePath).join('/')}`,
        }),
      ]),
    );
  };
};

export const useDeleteWorkspaceDocs = () => {
  const dispatch = useDispatch();
  const workspace = useSelector(selectGithubWorkspace);
  const [localDelete] = useDeleteDocMutation();
  return async (payload: DeleteDocPayload) => {
    if (workspace.mode === 'local') return localDelete(payload).unwrap();

    // Generate tombstones from the effective tree (base plus working), not only the remote manifest. This lets a
    // delete cancel an uncommitted creation and includes hidden/non-Markdown descendants in directory deletes.
    const effective = getEffectiveGitHubEntries(workspace);
    const overlays: GitHubOverlayEntry[] = [];
    const parentPaths: string[] = [];
    payload.forEach(({ filePath, isFile }) => {
      const operationId = createOperationId();
      const source = getRepositoryDocPath(workspace.config, filePath, isFile);
      parentPaths.push(source.split('/').slice(0, -1).join('/'));
      Object.values(effective).forEach((entry) => {
        if ((isFile && entry.path === source) || (!isFile && entry.path.startsWith(`${source}/`))) {
          overlays.push(
            createOverlay({
              path: entry.path,
              action: 'delete',
              mode: entry.mode,
              type: entry.type === 'tree' ? 'blob' : entry.type,
              operationId,
              label: `Delete ${denormalizePath(filePath).join('/')}`,
              scopePaths: [source],
            }),
          );
        }
      });
    });
    addEmptyParentMarkers(workspace, overlays, parentPaths);
    dispatch(applyWorkingEntries(overlays));
  };
};

export const useCopyCutWorkspaceDocs = () => {
  const dispatch = useDispatch();
  const workspace = useSelector(selectGithubWorkspace);
  const [localCopyCut] = useCopyCutDocMutation();
  return async (payload: CopyCutDocPayload, onApplied?: () => void) => {
    if (workspace.mode === 'local') {
      const result = await localCopyCut(payload).unwrap();
      onApplied?.();
      return result;
    }

    // Moves/copies are expressed as a single atomic overlay group: destination upserts plus source tombstones. Blob
    // SHAs are reused whenever content was not edited. `applyWorkingEntries` later cancels source paths that only
    // existed as unstaged creations, leaving the net tree instead of a create-then-delete history.
    const effective = getEffectiveGitHubEntries(workspace);
    const overlays: GitHubOverlayEntry[] = [];
    const emptiedParentPaths: string[] = [];
    payload.forEach(({ copyCutPath, pastePath, isCopy, isFile }) => {
      const source = getRepositoryDocPath(workspace.config, copyCutPath, isFile);
      const destination = getRepositoryDocPath(workspace.config, pastePath, isFile);
      const sourceLabelPath = denormalizePath(copyCutPath).join('/');
      const destinationLabelPath = denormalizePath(pastePath).join('/');
      const sourceWorkingEntry = workspace.working[source];
      const isUnstagedFileCreation = Boolean(
        !isCopy &&
          isFile &&
          !workspace.baseEntries[source] &&
          sourceWorkingEntry?.action === 'upsert' &&
          !sourceWorkingEntry.sha &&
          sourceWorkingEntry.content !== undefined &&
          !workspace.staged[source],
      );
      const operationId = isUnstagedFileCreation ? sourceWorkingEntry.operationId : createOperationId();
      const operationLabel = isUnstagedFileCreation
        ? `Create file ${destinationLabelPath}`
        : `${isCopy ? 'Copy' : 'Move'} ${sourceLabelPath} to ${destinationLabelPath}`;
      const destinationParent = destination.split('/').slice(0, -1).join('/');
      const destinationKeep = getKeepPath(destinationParent);
      if (destinationKeep && effective[destinationKeep]) {
        overlays.push(
          createOverlay({
            path: destinationKeep,
            action: 'delete',
            operationId,
            label: operationLabel,
          }),
        );
      }
      if (!isCopy) emptiedParentPaths.push(source.split('/').slice(0, -1).join('/'));
      Object.values(effective).forEach((entry) => {
        if (!((isFile && entry.path === source) || (!isFile && entry.path.startsWith(`${source}/`)))) return;
        const destinationPath = isFile ? destination : `${destination}${entry.path.slice(source.length)}`;
        overlays.push(
          createOverlay({
            path: destinationPath,
            action: 'upsert',
            mode: entry.mode,
            type: entry.type === 'tree' ? 'blob' : entry.type,
            sha: entry.sha || undefined,
            content: entry.content,
            operationId,
            label: operationLabel,
            scopePaths: [source, destination],
          }),
        );
        if (!isCopy) {
          overlays.push(
            createOverlay({
              path: entry.path,
              action: 'delete',
              mode: entry.mode,
              type: entry.type === 'tree' ? 'blob' : entry.type,
              operationId,
              label: overlays.at(-1)!.label,
              scopePaths: [source, destination],
            }),
          );
        }
      });
    });
    addEmptyParentMarkers(workspace, overlays, emptiedParentPaths);
    dispatch(applyWorkingEntries(overlays));
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
      [
        {
          copyCutPath: payload.filePath,
          pastePath: newPath,
          isCopy: false,
          isFile: payload.isFile,
        },
      ],
      onApplied,
    );
  };
};

export const selectGithubWorkspaceKey = (state: RootState) => getGitHubWorkspaceKey(state.githubWorkspace.config);
