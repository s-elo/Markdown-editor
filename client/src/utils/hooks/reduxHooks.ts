import { useSelector, useDispatch } from 'react-redux';

import { useCurPath } from './docHooks';
import { isPathsRelated } from '../utils';

import { useUpdateDocMutation } from '@/redux-api/docsApi';
import { selectCurDoc, selectCurTabs, updateIsDirty, updateTabs } from '@/redux-feature/curDocSlice';
import { selectReadonly, selectDarkMode, selectNarrowMode, updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
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
        modifyPath: contentPath,
        newContent: content,
      }).unwrap();

      // pop up to remind that is saved
      Toast('saved', 'SUCCESS');

      // after updated, it should not be dirty
      dispatch(updateIsDirty({ isDirty: false }));
    } catch (err) {
      Toast('Failed to save...', 'ERROR');
    }
  };
};

export const useSwitchReadonlyMode = () => {
  const readonly = useSelector(selectReadonly);

  const dispatch = useDispatch();

  return () => {
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
    dispatch(updateGlobalOpts({ keys: ['narrowMode'], values: [!narrowMode] }));
  };
};

export const useSwitchTheme = () => {
  const isDarkMode = useSelector(selectDarkMode);

  const dispatch = useDispatch();

  return () => {
    dispatch(
      updateGlobalOpts({
        keys: ['isDarkMode'],
        values: [!isDarkMode],
      }),
    );
  };
};

export const useDeleteTab = () => {
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();
  const { navigate, curPath } = useCurPath();

  return (deletePath: string) => {
    dispatch(
      updateTabs(
        tabs.filter((tab, idx) => {
          // handle curDoc
          if (deletePath === curPath.join('-')) {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            if (idx !== tabs.length - 1) void navigate(`/article/${tabs[idx + 1].path as string}`);
            // only one tab
            else if (idx === 0) void navigate('/purePage');
            else void navigate(`/article/${tabs[idx - 1].path as string}`);
          }
          return tab.path !== deletePath;
        }),
      ),
    );
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

    if (curPath.join('-') !== addPath) void navigate(`/article/${addPath}`);
  };
};

export const useRenameTab = () => {
  const { navigate, curPath } = useCurPath();
  const tabs = useSelector(selectCurTabs);
  const dispatch = useDispatch();

  return (oldPath: string, newPath: string, isFile: boolean) => {
    const oldPathArr = oldPath.split('-');

    dispatch(
      updateTabs(
        tabs.map(({ path, ...rest }) => {
          const pathArr = path.split('-');

          if (!isPathsRelated(pathArr, oldPathArr, isFile)) return { path, ...rest };

          // modified path is or includes the current path
          const curFile = pathArr.slice(pathArr.length - (pathArr.length - oldPathArr.length)).join('-');

          // current file is modified
          if (curFile.trim() === '') {
            if (path === curPath.join('-')) {
              void navigate(`/article/${newPath}`);
            }

            return { path: newPath, ...rest };
          }

          // current file is included the modified path
          if (path === curPath.join('-')) {
            void navigate(`/article/${newPath}-${curFile as string}`);
          }

          return { path: `${newPath}-${curFile as string}`, ...rest };
        }),
      ),
    );
  };
};
