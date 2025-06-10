/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MilkdownProvider } from '@milkdown/react';
import ClipboardJS from 'clipboard';
import { createRoot } from 'react-dom/client';
import { useDispatch, Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import Outline from '../Outline/Outline';

import { updateScrolling } from '@/redux-feature/curDocSlice';
import { updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { store } from '@/store';
import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';
import Toast from '@/utils/Toast';
import { throttle, updateLocationHash } from '@/utils/utils';

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
  const milkdownDom = document.getElementsByClassName('milkdown')[0];

  // get the previous scroll top
  milkdownDom.scrollTop = prevScroll;

  // bind the event after the first rendering caused by the above operation...
  setTimeout(() => {
    const eventFn = throttle(() => {
      const currentScrollTop = milkdownDom.scrollTop;

      // sync to the location hash
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((ha) => {
        const rect = ha.getBoundingClientRect();
        if (rect.top > 0 && rect.top < 150) {
          updateLocationHash(ha.getAttribute('id') ?? '');
        }
      });

      dispatch(updateScrolling({ scrollTop: currentScrollTop }));
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
export function anchorHandler(
  anchor: string,
  dispatch: ReturnType<typeof useDispatch>,
  scrollToAnchor: ReturnType<typeof useEditorScrollToAnchor>,
) {
  const locationHash = window.location.hash.slice(1);
  let hashAnchor = '';
  if (locationHash) {
    const heading = document.getElementById(decodeURI(locationHash));
    if (heading) {
      hashAnchor = heading.innerText;
    }
  }
  scrollToAnchor(hashAnchor || anchor);

  // clear the anchor to avoid re-anchor when switch modes
  // the actual scrolling will be recorded in current global doc info above
  dispatch(updateGlobalOpts({ keys: ['anchor'], values: [''] }));
}

/**
 * handle heading anchor (add the outline aside headings)
 */
export function addHeadingAnchor(curPath: string[]) {
  // add outline on each heading
  const headingDoms = document.getElementsByClassName('heading');
  if (!headingDoms) return;

  for (const headingDom of headingDoms) {
    const div = document.createElement('div');
    div.classList.add('heading-outline');

    headingDom.appendChild(div);

    createRoot(div).render(
      <Provider store={store}>
        <BrowserRouter>
          <MilkdownProvider>
            <Outline containerDom={document.getElementsByClassName('milkdown')[0] as HTMLElement} path={curPath} />
          </MilkdownProvider>
        </BrowserRouter>
      </Provider>,
    );
  }
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
 * add a copy btn at each code fence
 */
export function addClipboard(readonly: boolean) {
  if (!readonly) return;

  const codeFences = document.getElementsByClassName('milkdown-code-block') as HTMLCollectionOf<HTMLElement>;

  const clipboards: ClipboardJS[] = [];

  for (const [idx, codeFence] of [...codeFences].entries()) {
    // get the code dom and add an id attribute
    const codeDom = codeFence.querySelector('code');
    codeDom?.setAttribute('id', `code-${idx}`);

    const copyBtn = document.createElement('button');
    copyBtn.classList.add('code-fence-copy-btn');
    copyBtn.innerText = `copy`;
    copyBtn.setAttribute('data-clipboard-target', `#code-${idx}`);

    codeFence.appendChild(copyBtn);

    const clipboard = new ClipboardJS(copyBtn);

    clipboard
      .on('success', (e) => {
        e.clearSelection();
        Toast('copied!', 'SUCCESS');
      })
      .on('error', () => {
        Toast('failed to copy...', 'ERROR');
      });

    clipboards.push(clipboard);
  }

  pushRemover(() => {
    clipboards.forEach((c) => {
      c.destroy();
    });
  });
}

/**
 * sync the mirror anchor when double clicking a element in Editor
 * but only works for readonly mode currently...
 */
export function syncMirror(readonly: boolean) {
  if (!readonly) return;

  const editorDom = document.querySelector('.editor');
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

    return curTotalLine + lines.length + 1;
  }, 0);

  [...blockDoms].forEach((blockDom, idx) => {
    const dbClickEvent = (e: Event) => {
      const mirrorDom = document.querySelector('.cm-content');
      const mirrorScroller = document.querySelector('.cm-scroller');
      if (!mirrorDom || !mirrorScroller) return;

      const lineDoms = mirrorDom.children;
      if (lineDoms.length === 0 || !lineDoms[idx]) return;

      const oneLineHeight = Number(getComputedStyle(lineDoms[0]).height.replace('px', ''));

      const clickDom = e.target as HTMLElement;

      let lineNum = blockLineNum[idx];
      // when it is a paragraph and it is one of children of the blockDom
      // make the position more accurate
      if (clickDom !== blockDom && clickDom.classList.contains('paragraph')) {
        const lines = (blockDom as HTMLElement).innerText.split('\n');

        if (clickDom) {
          const lineIdx = lines.findIndex((line) => line === clickDom.innerText);

          if (lineIdx) lineNum += lineIdx;
        }
      }

      mirrorScroller.scroll({
        top: lineNum * oneLineHeight,
        behavior: 'smooth',
      });
    };

    blockDom.addEventListener('dblclick', dbClickEvent);
    pushRemover(() => {
      blockDom.removeEventListener('dblclick', dbClickEvent);
    });
  });
}
