import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

import { useDeleteTab, useRenameTab, useSaveDoc } from './reduxHooks';
import { denormalizePath, getCurrentPath, isPathsRelated, normalizePath } from '../utils';

import { Change } from '@/redux-api/git';
import { updateCurDoc, selectCurDocDirty } from '@/redux-feature/curDocSlice';
import { updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { updateCopyCut, selectOperationMenu } from '@/redux-feature/operationMenuSlice';

export const useCurPath = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return {
    navigate,
    curPath: getCurrentPath(pathname),
  };
};

// TODO: to replaced by useDeleteEffect
export const useDeleteHandler = () => {
  const { curPath } = useCurPath();

  const { copyPath, cutPath } = useSelector(selectOperationMenu);
  const isDirty = useSelector(selectCurDocDirty);

  const dispatch = useDispatch();

  const deleteTab = useDeleteTab();

  return (deletedPath: string, isFile: boolean) => {
    if (deletedPath === copyPath || deletedPath === cutPath) {
      // clear the previous copy and cut
      dispatch(
        updateCopyCut({
          copyPath: '',
          cutPath: '',
        }),
      );
    }

    // jump if the current doc is deleted or included in the deleted folder
    if (isPathsRelated(curPath, denormalizePath(deletedPath), isFile)) {
      // clear global curDoc info
      if (isDirty) {
        dispatch(
          updateCurDoc({
            content: '',
            isDirty: false,
            contentPath: '',
            scrollTop: 0,
          }),
        );
      }

      deleteTab(normalizePath(curPath));
    }
  };
};

// TODO: to remove
export const useCopyCutHandler = () => {
  const { navigate, curPath } = useCurPath();

  return (copyCutPath: string, pastePath: string, isCut: boolean, isFile: boolean) => {
    // if it is cut and current path is included in it, redirect
    if (isCut && isPathsRelated(curPath, denormalizePath(copyCutPath), isFile)) {
      // if it is a file, direct to the paste path
      if (isFile) {
        void navigate(`/article/${pastePath}`);
      } else {
        const curFile = curPath.slice(curPath.length - (curPath.length - denormalizePath(copyCutPath).length));

        void navigate(`/article/${normalizePath([pastePath, ...curFile])}`);
      }
    }
  };
};

// TODO: to remove
export const useModifyNameHandler = () => {
  const renameTab = useRenameTab();

  return (modifiedPath: string[], newPath: string, isFile: boolean) => {
    renameTab(normalizePath(modifiedPath), newPath, isFile);
  };
};

/**
 * handler for git restore at working space
 */
export const useRestoreHandler = () => {
  const deleteHandler = useDeleteHandler();

  return (staged: boolean, changes: Change[]) => {
    // if it is in the working space and restored changes include untracked status
    // call the deleteHandler
    if (!staged) {
      for (const change of changes) {
        if (change.status === 'UNTRACKED') {
          deleteHandler(change.changePath.replace('.md', '').replaceAll('/', '-'), true);
        }
      }
    }
  };
};

export const useEditorScrollToAnchor = () => {
  const { navigate, curPath } = useCurPath();

  const dispatch = useDispatch();
  const saveDoc = useSaveDoc();

  return (anchor: string, path = '') => {
    // only do if path is provided
    if (path !== '' && normalizePath(curPath) !== path) {
      if (anchor !== '') {
        // tell the editor through global opts
        dispatch(updateGlobalOpts({ keys: ['anchor'], values: [anchor] }));
      }

      void saveDoc();

      void navigate(`/article/${path}`);
      return;
    }

    if (anchor !== '') {
      const dom = [...(document.querySelector('.milkdown')?.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? [])].find(
        (head) => (head as HTMLElement).innerText === anchor,
      );
      const strongDom = [...document.querySelectorAll('strong')].find((keyword) => keyword.innerText === anchor);
      if (!dom && !strongDom) return;

      const parentDom = document.getElementsByClassName('milkdown')[0] as HTMLElement;

      parentDom.scroll({
        top: dom ? (dom as HTMLElement).offsetTop : strongDom!.offsetTop,
        behavior: 'smooth',
      });

      return dom ?? strongDom;
    }
  };
};
