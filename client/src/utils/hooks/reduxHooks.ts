import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { useCurPath } from './docHooks';
import {
  confirm,
  denormalizePath,
  getDraftKey,
  isPathsRelated,
  normalizePath,
  Themes,
  updateLocationHash,
} from '../utils';

import type { RootState } from '@/store';

import { APP_VERSION } from '@/constants';
import { useCheckServerQuery } from '@/redux-api/docs';
import { useGetSettingsQuery } from '@/redux-api/settings';
import { selectCurDoc, selectCurTabs, updateIsDirty, updateTabs } from '@/redux-feature/curDocSlice';
import { clearDraft, clearDrafts, DraftsState, selectHasDraft, setDraft } from '@/redux-feature/draftsSlice';
import { getGitHubWorkspaceKey, selectGithubWorkspace } from '@/redux-feature/githubWorkspaceSlice';
import {
  selectReadonly,
  selectNarrowMode,
  updateGlobalOpts,
  updateServerStatus,
  ServerStatus,
} from '@/redux-feature/globalOptsSlice';
import { store } from '@/store';
import { useUpdateWorkspaceDoc } from '@/utils/hooks/workspaceHooks';
import Toast from '@/utils/Toast';

export const useSaveDoc = () => {
  const { isDirty, content, contentIdent, type } = useSelector(selectCurDoc);
  const githubWorkspace = useSelector(selectGithubWorkspace);
  const { data: settings } = useGetSettingsQuery(undefined, { skip: githubWorkspace.mode === 'github' });
  const dispatch = useDispatch();
  const updateDoc = useUpdateWorkspaceDoc();

  return async () => {
    if (!isDirty) return;

    try {
      if (type === 'workspace') {
        await updateDoc({
          filePath: contentIdent,
          content,
        });
        Toast('saved successfully!');
        dispatch(updateIsDirty({ isDirty: false }));
        const workspaceKey =
          githubWorkspace.mode === 'github' ? getGitHubWorkspaceKey(githubWorkspace.config) : settings?.docRootPath;
        dispatch(clearDraft(getDraftKey(workspaceKey, contentIdent)));
      }
    } catch (err) {
      Toast.error((err as Error).message);
    }
  };
};

export const useSwitchReadonlyMode = () => {
  const readonly = useSelector(selectReadonly);

  const dispatch = useDispatch();

  return () => {
    // avoid re-anchor
    updateLocationHash('');
    dispatch(
      updateGlobalOpts({
        keys: ['readonly'],
        values: [!readonly],
      }),
    );
  };
};

export const useSwitchNarrowMode = () => {
  const narrowMode = useSelector(selectNarrowMode);

  const dispatch = useDispatch();

  return () => {
    // avoid re-anchor
    updateLocationHash('');
    dispatch(updateGlobalOpts({ keys: ['narrowMode'], values: [!narrowMode] }));
  };
};

export const useSwitchTheme = () => {
  const dispatch = useDispatch();

  return (theme: Themes) => {
    // avoid re-anchor
    updateLocationHash('');
    dispatch(
      updateGlobalOpts({
        keys: ['theme'],
        values: [theme],
      }),
    );
  };
};

export const useDeleteTab = () => {
  const tabs = useSelector(selectCurTabs);
  const githubWorkspace = useSelector(selectGithubWorkspace);
  const { data: settings } = useGetSettingsQuery(undefined, { skip: githubWorkspace.mode === 'github' });
  const dispatch = useDispatch();
  const { navigate, curPath } = useCurPath();
  const workspaceKey =
    githubWorkspace.mode === 'github' ? getGitHubWorkspaceKey(githubWorkspace.config) : settings?.docRootPath;
  const hasDraftFor = (path: string) => selectHasDraft(getDraftKey(workspaceKey, path))(store.getState());

  return async (deletePaths: string[], options: { force?: boolean } = {}) => {
    const hasUnsaved = deletePaths.some((p) => hasDraftFor(p));
    if (hasUnsaved && !options.force) {
      const message =
        deletePaths.length === 1
          ? 'This document has unsaved changes. Close anyway?'
          : 'Some documents have unsaved changes. Close anyway?';
      const confirmed = await confirm({ message });
      if (!confirmed) return;
    }

    let curPathIncluded = false;
    const newTabs = tabs.filter((tab) => {
      for (const deletePath of deletePaths) {
        if (deletePath === normalizePath(curPath)) {
          curPathIncluded = true;
        }
        if (tab.ident === deletePath) return false;
      }
      return true;
    });

    dispatch(updateTabs(newTabs));
    if (!options.force) {
      dispatch(clearDrafts(deletePaths.map((p) => getDraftKey(workspaceKey, p))));
    }

    if (curPathIncluded) {
      if (newTabs.length === 0) {
        void navigate('/purePage');
      } else {
        const lastTab = newTabs[newTabs.length - 1];
        if (lastTab.type === 'workspace') {
          void navigate(`/article/${lastTab.ident}`);
        } else if (lastTab.type === 'internal') {
          void navigate(`/internal/${lastTab.ident}`);
        }
      }
    }
  };
};

export const useAddTab = () => {
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();
  const { navigate, curPath } = useCurPath();

  return (addPath: string) => {
    dispatch(
      updateTabs(
        tabs.concat({
          active: true,
          ident: addPath,
          scroll: 0,
          type: 'workspace',
        }),
      ),
    );

    if (normalizePath(curPath) !== addPath) void navigate(`/article/${addPath}`);
  };
};

interface TabRename {
  oldPath: string;
  newPath: string;
  isFile: boolean;
}

export const useRenameTabs = () => {
  const { navigate, curPath } = useCurPath();
  const tabs = useSelector(selectCurTabs);
  const githubWorkspace = useSelector(selectGithubWorkspace);
  const { data: settings } = useGetSettingsQuery(undefined, { skip: githubWorkspace.mode === 'github' });
  const dispatch = useDispatch();

  return (operations: TabRename[]) => {
    const renames: { oldPath: string; newPath: string }[] = [];
    const currentPath = normalizePath(curPath);
    const renamePath = (path: string) => {
      let renamedPath = path;
      operations.forEach(({ oldPath, newPath, isFile }) => {
        const oldPathArr = denormalizePath(oldPath);
        const pathArr = denormalizePath(renamedPath);
        if (!isPathsRelated(pathArr, oldPathArr, isFile)) return;

        const suffix = pathArr.slice(oldPathArr.length);
        renamedPath = suffix.length ? normalizePath([newPath, ...suffix]) : newPath;
      });
      return renamedPath;
    };
    const renamedCurrentPath = renamePath(currentPath);

    const newTabs = tabs.map((tab) => {
      if (tab.type !== 'workspace') return tab;

      const originalPath = tab.ident;
      const renamedPath = renamePath(originalPath);

      if (renamedPath === originalPath) return tab;
      renames.push({ oldPath: originalPath, newPath: renamedPath });
      return { ...tab, ident: renamedPath };
    });

    dispatch(updateTabs(newTabs));
    if (renamedCurrentPath !== currentPath) void navigate(`/article/${renamedCurrentPath}`);

    const state = store.getState() as RootState;
    const drafts = state.drafts as DraftsState;
    for (const { oldPath: op, newPath: np } of renames) {
      const workspaceKey =
        githubWorkspace.mode === 'github' ? getGitHubWorkspaceKey(githubWorkspace.config) : settings?.docRootPath;
      const oldKey = getDraftKey(workspaceKey, op);
      const draft = drafts[oldKey];
      if (draft) {
        dispatch(setDraft({ path: getDraftKey(workspaceKey, np), ...draft }));
        dispatch(clearDraft(oldKey));
      }
    }
  };
};

export const useRenameTab = () => {
  const renameTabs = useRenameTabs();
  return (oldPath: string, newPath: string, isFile: boolean) => {
    renameTabs([{ oldPath, newPath, isFile }]);
  };
};

export function useCheckServer(enabled = true) {
  const res = useCheckServerQuery(undefined, { skip: !enabled, refetchOnMountOrArgChange: true });
  const { data: serverCheckRes, isLoading, isSuccess, error } = res;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled) return;

    if (!isLoading && !isSuccess) {
      dispatch(updateServerStatus(ServerStatus.CANNOT_CONNECT));

      dispatch(
        updateGlobalOpts({
          keys: ['mirrorCollapse'],
          values: [true],
        }),
      );

      if (!error) return;

      Toast.error('Cannot connect to server');
      console.error(error);
    } else if (isSuccess) {
      if (APP_VERSION !== serverCheckRes?.version) {
        dispatch(updateServerStatus(ServerStatus.VERSION_MISMATCHE));
      } else {
        dispatch(updateServerStatus(ServerStatus.RUNNING));
      }
    }
  }, [dispatch, enabled, error, isLoading, isSuccess, serverCheckRes?.version]);

  return res;
}

export function useWarnUnsavedOnUnload() {
  const hasDrafts = useSelector((state: RootState) => Object.keys(state.drafts).length > 0);

  useEffect(() => {
    if (!hasDrafts) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [hasDrafts]);
}
