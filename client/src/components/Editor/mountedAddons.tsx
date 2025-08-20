/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useDispatch } from 'react-redux';

import { updateScrolling } from '@/redux-feature/curDocSlice';
import { updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { getEditorScrollContainer, scrollToEditorAnchor, scrollToOutlineAnchor } from '@/utils/hooks/docHooks';
import { throttle } from '@/utils/utils';

let removers: (() => void)[] = [];
function pushRemover(r: () => void) {
  removers.push(r);
}
/**
 * remove all the events and unmounted doms of each addon
 */
export function removeEvents() {
  removers.forEach((r) => {
    r();
  });
  removers = [];
}

/**
 * handle scrolling - record the scrolling status of previous visited docs
 * then record current docs scroll top globally
 */
export function scrollHandler(prevScroll: number, dispatch: ReturnType<typeof useDispatch>) {
  const milkdownDom = getEditorScrollContainer();
  if (!milkdownDom) return;

  // get the previous scroll top
  milkdownDom.scrollTop = prevScroll;

  const syncAnchor = () => {
    const headings = document.querySelectorAll('.milkdown-heading');
    headings.forEach((ha) => {
      const rect = ha.getBoundingClientRect();
      if (rect.top > 0 && rect.top < 150) {
        dispatch(updateGlobalOpts({ keys: ['anchor'], values: [ha.id] }));
      }
    });
  };

  // wait for the outline to render
  setTimeout(() => {
    syncAnchor();
  }, 100);

  // bind the event after the first rendering caused by the above operation...
  setTimeout(() => {
    const eventFn = throttle(() => {
      const currentScrollTop = milkdownDom.scrollTop;

      dispatch(updateScrolling({ scrollTop: currentScrollTop }));

      syncAnchor();
    }, 100);

    milkdownDom.addEventListener('scroll', eventFn);

    pushRemover(() => {
      milkdownDom.removeEventListener('scroll', eventFn);
    });
  }, 0);
}

/**
 * record blur status about if the mouse is on the milkdown or not
 */
export function blurHandler(dispatch: ReturnType<typeof useDispatch>) {
  const milkdownDom = document.getElementsByClassName('milkdown')[0];

  const enterFn = () => {
    dispatch(
      updateGlobalOpts({
        keys: ['isEditorBlur'],
        values: [false],
      }),
    );
  };
  const leaveFn = () => {
    dispatch(
      updateGlobalOpts({
        keys: ['isEditorBlur'],
        values: [true],
      }),
    );
  };

  milkdownDom.addEventListener('mouseenter', enterFn);
  milkdownDom.addEventListener('mouseleave', leaveFn);

  pushRemover(() => {
    milkdownDom.removeEventListener('mouseenter', enterFn);
    milkdownDom.removeEventListener('mouseleave', leaveFn);
  });
}

/**
 * handle anchor
 */
export function anchorHandler(anchor: string, dispatch: ReturnType<typeof useDispatch>) {
  const locationHash = window.location.hash.slice(1);
  let hashAnchor = '';
  if (locationHash) {
    const heading = document.getElementById(decodeURI(locationHash));
    if (heading) {
      hashAnchor = heading.id;
    }
  }
  scrollToEditorAnchor(hashAnchor || anchor);
  scrollToOutlineAnchor(hashAnchor || anchor, true);
  dispatch(updateGlobalOpts({ keys: ['anchor'], values: [hashAnchor || anchor] }));
}

export function keywordsHandler(keywords: string[]) {
  const domSet = new Set();
  // filter the repeated keyword doms
  const strongDoms = [...document.getElementsByClassName('strong')].filter(
    (dom) => !domSet.has(dom.innerHTML) && domSet.add(dom.innerHTML),
  );

  if (strongDoms && strongDoms.length !== 0) {
    let idx = 0;
    for (const strongDom of strongDoms) {
      strongDom.setAttribute('id', keywords[idx].replace(/\s/g, '-').toLowerCase());
      idx++;
    }
  }
}

/**
 * sync the mirror anchor when double clicking a element in Editor
 * but only works for readonly mode currently...
 */
export function syncMirror(readonly: boolean) {
  if (!readonly) return;

  const editorDom = document.querySelector('.milkdown .editor');
  if (!editorDom) return;

  const blockDoms = editorDom.children;

  const blockLineNum = new Array(blockDoms.length).fill(0);

  // prerecord the line number of each big block (top children of the editor)
  [...blockDoms].reduce((curTotalLine, blockDom, idx) => {
    const lines = (blockDom as HTMLElement).innerText.split('\n');

    // record the start line number
    blockLineNum[idx] = curTotalLine;

    if (blockDom.querySelector('img') || blockDom.querySelector('iframe')) {
      // special case handling for img and iframe block
      curTotalLine--;
    }

    if (blockDom.classList.contains('milkdown-code-block')) {
      curTotalLine -= blockDom.querySelector('.cm-content')?.children.length ?? 0;
    }

    return curTotalLine + lines.length + 1;
  }, 0);

  [...blockDoms].forEach((blockDom, idx) => {
    const dbClickEvent = (e: Event) => {
      const mirrorDom = document.querySelector('.code-mirror-container .cm-content');
      const mirrorScroller = document.querySelector('.code-mirror-container .cm-scroller');
      if (!mirrorDom || !mirrorScroller) return;

      const lineDoms = mirrorDom.children;
      if (lineDoms.length === 0 || !lineDoms[idx]) return;

      const oneLineHeight = Number(getComputedStyle(lineDoms[0]).height.replace('px', ''));

      const clickDom = e.target as HTMLElement;

      let lineNum = blockLineNum[idx];
      // when it is a paragraph and it is one of children of the blockDom
      // make the position more accurate
      if (clickDom !== blockDom && clickDom.tagName === 'P') {
        const lines = (blockDom as HTMLElement).innerText.split('\n');

        if (clickDom) {
          const lineIdx = lines.findIndex((line) => line === clickDom.innerText);

          if (lineIdx) lineNum += lineIdx;
        }
      }

      mirrorScroller.scroll({
        // just make some offset
        top: (lineNum - 3) * oneLineHeight,
        behavior: 'smooth',
      });
    };

    blockDom.addEventListener('dblclick', dbClickEvent);
    pushRemover(() => {
      blockDom.removeEventListener('dblclick', dbClickEvent);
    });
  });
}
