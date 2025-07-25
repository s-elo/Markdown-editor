import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

import { useSaveDoc } from './reduxHooks';
import { getCurrentPath, normalizePath } from '../utils';

import { useDeleteEffect } from '@/components/Menu/operations';
import { Change } from '@/redux-api/git';
import { updateGlobalOpts } from '@/redux-feature/globalOptsSlice';

export const useCurPath = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return {
    navigate,
    curPath: getCurrentPath(pathname),
  };
};

/**
 * handler for git restore at working space
 */
export const useRestoreHandler = () => {
  const deleteHandler = useDeleteEffect();

  return (staged: boolean, changes: Change[]) => {
    // if it is in the working space and restored changes include untracked status
    // call the deleteHandler
    if (!staged) {
      for (const change of changes) {
        if (change.status === 'UNTRACKED') {
          deleteHandler([{ deletedPath: normalizePath(change.changePath.replace('.md', '')), isFile: true }]);
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
