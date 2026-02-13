import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { useCurPath } from './docHooks';
import { denormalizePath, isPathsRelated, normalizePath, Themes, updateLocationHash } from '../utils';

import { useCheckServerQuery, useUpdateDocMutation } from '@/redux-api/docs';
import { selectCurDoc, selectCurTabs, updateIsDirty, updateTabs } from '@/redux-feature/curDocSlice';
import {
  selectReadonly,
  selectNarrowMode,
  updateGlobalOpts,
  updateServerStatus,
  ServerStatus,
} from '@/redux-feature/globalOptsSlice';
import Toast from '@/utils/Toast';

export const useSaveDoc = () => {
  const { isDirty, content, contentPath } = useSelector(selectCurDoc);

  const dispatch = useDispatch();
  const [
    updateDoc,
    // { isLoading }
  ] = useUpdateDocMutation();

  return async () => {
    if (!isDirty) return;

    try {
      await updateDoc({
        filePath: contentPath,
        content,
      }).unwrap();

      // pop up to remind that is saved
      Toast('saved successfully!');

      // after updated, it should not be dirty
      dispatch(updateIsDirty({ isDirty: false }));
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
  const dispatch = useDispatch();
  const { navigate, curPath } = useCurPath();

  return (deletePaths: string[]) => {
    let curPathIncluded = false;
    const newTabs = tabs.filter((tab) => {
      for (const deletePath of deletePaths) {
        if (deletePath === normalizePath(curPath)) {
          curPathIncluded = true;
        }
        if (tab.path === deletePath) return false;
      }
      return true;
    });

    dispatch(updateTabs(newTabs));

    if (curPathIncluded) {
      if (newTabs.length === 0) {
        void navigate('/purePage');
      } else {
        void navigate(`/article/${newTabs[newTabs.length - 1].path as string}`);
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
          path: addPath,
          scroll: 0,
        }),
      ),
    );

    if (normalizePath(curPath) !== addPath) void navigate(`/article/${addPath}`);
  };
};

export const useRenameTab = () => {
  const { navigate, curPath } = useCurPath();
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();

  return (oldPath: string, newPath: string, isFile: boolean) => {
    const oldPathArr = denormalizePath(oldPath);

    dispatch(
      updateTabs(
        tabs.map(({ path, ...rest }) => {
          const pathArr = denormalizePath(path);

          if (!isPathsRelated(pathArr, oldPathArr, isFile)) return { path, ...rest };

          // modified path is or includes the current path
          const curFile = pathArr.slice(pathArr.length - (pathArr.length - oldPathArr.length)).join('/');

          // current file is modified
          if (curFile.trim() === '') {
            if (path === normalizePath(curPath)) {
              void navigate(`/article/${newPath}`);
            }

            return { path: newPath, ...rest };
          }

          // current file is included the modified path
          if (path === normalizePath(curPath)) {
            void navigate(`/article/${normalizePath([newPath, curFile])}`);
          }

          return { path: normalizePath([newPath, curFile]), ...rest };
        }),
      ),
    );
  };
};

export function useCheckServer() {
  const { data: serverCheckRes, isLoading, isSuccess, error } = useCheckServerQuery();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isLoading && !isSuccess) {
      dispatch(updateServerStatus(ServerStatus.CANNOT_CONNECT));

      dispatch(
        updateGlobalOpts({
          keys: ['menuCollapse', 'outlineCollapse', 'mirrorCollapse'],
          values: [true, true, true],
        }),
      );

      if (!error) return;

      Toast.error('Cannot connect to server');
      console.error(error);
    }
  }, [isSuccess, error, isLoading]);

  return serverCheckRes;
}
