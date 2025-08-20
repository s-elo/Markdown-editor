import { useNavigate, useLocation } from 'react-router-dom';

import { useSaveDoc } from './reduxHooks';
import { getCurrentPath, normalizePath } from '../utils';

import { useDeleteEffect } from '@/components/Menu/operations';
import { Change } from '@/redux-api/git';

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
          deleteHandler([{ filePath: normalizePath(change.changePath.replace('.md', '')), isFile: true }]);
        }
      }
    }
  };
};

export const getEditorScrollContainer = () => {
  return document.querySelector('.editor-box .p-scrollpanel-content');
};

export const scrollToOutlineAnchor = (anchor: string, wait = false) => {
  const act = () => {
    const outline = document.getElementById(`outline-${anchor}`);
    const scrollDom = document.querySelector('.outline-container .p-scrollpanel-content');
    if (outline && scrollDom) {
      scrollDom.scrollTo({
        top: outline.offsetTop,
        behavior: 'auto',
      });
    }
  };
  if (wait) {
    setTimeout(() => {
      act();
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    }, 100);
  } else {
    act();
  }
};

export const scrollToEditorAnchor = (anchor: string) => {
  const dom = document.getElementById(anchor);
  const scrollDom = getEditorScrollContainer();
  if (dom && scrollDom) {
    scrollDom.scrollTo({
      top: dom.offsetTop,
      behavior: 'auto',
    });
  }
};

export const useEditorScrollToAnchor = () => {
  const { navigate, curPath } = useCurPath();
  const saveDoc = useSaveDoc();

  return (anchor: string, path = '') => {
    // only do if path is provided
    if (path !== '' && normalizePath(curPath) !== path) {
      void saveDoc();
      void navigate(`/article/${path}#${anchor}`);
      return;
    }

    if (anchor !== '') {
      scrollToEditorAnchor(anchor);
      scrollToOutlineAnchor(anchor, true);
      return;
    }
  };
};
