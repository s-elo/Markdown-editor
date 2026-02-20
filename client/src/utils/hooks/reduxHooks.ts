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
import { useCheckServerQuery, useUpdateDocMutation } from '@/redux-api/docs';
import { useGetSettingsQuery } from '@/redux-api/settings';
import { selectCurDoc, selectCurTabs, updateIsDirty, updateTabs } from '@/redux-feature/curDocSlice';
import { clearDraft, clearDrafts, DraftsState, selectHasDraft, setDraft } from '@/redux-feature/draftsSlice';
import {
  selectReadonly,
  selectNarrowMode,
  updateGlobalOpts,
  updateServerStatus,
  ServerStatus,
} from '@/redux-feature/globalOptsSlice';
import { store } from '@/store';
import Toast from '@/utils/Toast';

export const useSaveDoc = () => {
  const { isDirty, content, contentIdent, type } = useSelector(selectCurDoc);
  const { data: settings } = useGetSettingsQuery();
  const dispatch = useDispatch();
  const [updateDoc] = useUpdateDocMutation();

  return async () => {
    if (!isDirty) return;

    try {
      if (type === 'workspace') {
        await updateDoc({
          filePath: contentIdent,
          content,
        }).unwrap();
        Toast('saved successfully!');
        dispatch(updateIsDirty({ isDirty: false }));
        dispatch(clearDraft(getDraftKey(settings?.docRootPath, contentIdent)));
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
  const { data: settings } = useGetSettingsQuery();
  const dispatch = useDispatch();
  const { navigate, curPath } = useCurPath();
  const hasDraftFor = (path: string) => selectHasDraft(getDraftKey(settings?.docRootPath, path))(store.getState());

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
      dispatch(clearDrafts(deletePaths.map((p) => getDraftKey(settings?.docRootPath, p))));
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

export const useRenameTab = () => {
  const { navigate, curPath } = useCurPath();
  const tabs = useSelector(selectCurTabs);
  const { data: settings } = useGetSettingsQuery();
  const dispatch = useDispatch();

  return (oldPath: string, newPath: string, isFile: boolean) => {
    const oldPathArr = denormalizePath(oldPath);
    const renames: { oldPath: string; newPath: string }[] = [];

    const newTabs = tabs
      .filter((t) => t.type === 'workspace')
      .map(({ ident: path, ...rest }) => {
        const pathArr = denormalizePath(path);

        if (!isPathsRelated(pathArr, oldPathArr, isFile)) return { ident: path, ...rest };

        const curFile = pathArr.slice(pathArr.length - (pathArr.length - oldPathArr.length)).join('/');
        const docPath = path;

        if (curFile.trim() === '') {
          if (path === normalizePath(curPath)) {
            void navigate(`/article/${newPath}`);
          }
          renames.push({ oldPath: docPath, newPath });
          return { ident: newPath, ...rest };
        }

        if (path === normalizePath(curPath)) {
          void navigate(`/article/${normalizePath([newPath, curFile])}`);
        }
        const newDocPath = normalizePath([newPath, curFile]);
        renames.push({ oldPath: docPath, newPath: newDocPath });
        return { ident: newDocPath, ...rest };
      });

    dispatch(updateTabs(newTabs));

    const state = store.getState() as RootState;
    const drafts = state.drafts as DraftsState;
    for (const { oldPath: op, newPath: np } of renames) {
      const oldKey = getDraftKey(settings?.docRootPath, op);
      const draft = drafts[oldKey];
      if (draft) {
        dispatch(setDraft({ path: getDraftKey(settings?.docRootPath, np), ...draft }));
        dispatch(clearDraft(oldKey));
      }
    }
  };
};

export function useCheckServer() {
  const res = useCheckServerQuery();
  const { data: serverCheckRes, isLoading, isSuccess, error } = res;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isLoading && !isSuccess) {
      dispatch(updateServerStatus(ServerStatus.CANNOT_CONNECT));

      dispatch(
        updateGlobalOpts({
          keys: ['menuCollapse', 'mirrorCollapse'],
          values: [true, true],
        }),
      );

      if (!error) return;

      Toast.error('Cannot connect to server');
      console.error(error);
    } else if (isSuccess) {
      if (APP_VERSION !== serverCheckRes?.version) {
        dispatch(updateServerStatus(ServerStatus.VERSION_MISMATCHE));
      }
    }
  }, [isSuccess, error, isLoading]);

  return res;
}
