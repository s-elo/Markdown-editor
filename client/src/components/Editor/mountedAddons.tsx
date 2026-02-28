/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import { useDispatch } from 'react-redux';

import type { EditorView } from '@milkdown/kit/prose/view';

import { updateScrolling } from '@/redux-feature/curDocSlice';
import { updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { getEditorScrollContainer, scrollToEditorAnchor } from '@/utils/hooks/docHooks';
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
        // notify the outline to select the heading, but not set the anchor to location hash
        dispatch(updateGlobalOpts({ keys: ['anchor'], values: [ha.id] }));
      }
    });
  };

  // wait for the outline
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
export function anchorHandler(dispatch: ReturnType<typeof useDispatch>) {
  const locationHash = window.location.hash.slice(1);
  let hashAnchor = '';
  if (locationHash) {
    const heading = document.getElementById(decodeURI(locationHash));
    if (heading) {
      hashAnchor = heading.id;
    }
  }
  scrollToEditorAnchor(hashAnchor);
  dispatch(updateGlobalOpts({ keys: ['anchor'], values: [hashAnchor || ''] }));
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

const HIGHLIGHT_DURATION_MS = 3500;

function applyHighlightAndScroll(view: EditorView, from: number, to: number) {
  // Scroll the match into view, positioned at roughly 1/3 from the top
  const scrollContainer = getEditorScrollContainer();
  if (scrollContainer) {
    try {
      const coords = view.coordsAtPos(from);
      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollTop = Number(scrollContainer.scrollTop);
      scrollContainer.scrollTo({
        top: scrollTop + (coords.top - containerRect.top) - containerRect.height / 3,
        behavior: 'instant',
      });
    } catch {
      /* ignore coordinate errors */
    }
  }

  // Add a visual decoration highlight that works regardless of focus state.
  //    Native selection depends on focus, contenteditable, and browser quirks;
  //    decorations are rendered as styled DOM elements and always visible.
  try {
    view.setProps({
      decorations(state) {
        try {
          return DecorationSet.create(state.doc, [Decoration.inline(from, to, { class: 'search-match-highlight' })]);
        } catch {
          return DecorationSet.empty;
        }
      },
    });

    setTimeout(() => {
      try {
        if (!view.dom.isConnected) return;
        view.setProps({ decorations: () => DecorationSet.empty });
      } catch {
        /* view may have been destroyed */
      }
    }, HIGHLIGHT_DURATION_MS);
  } catch {
    /* setProps failed */
  }
}

function stripMarkdownSyntax(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/^\s*>\s+/, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

/**
 * Search for query text in the ProseMirror document and select the best match.
 * Uses lineContent (raw markdown line) for disambiguation when multiple matches exist.
 * Returns true if a match was found and selected.
 */
export function searchAndHighlight(view: EditorView, query: string, lineContent: string): boolean {
  const { doc } = view.state;
  const lowerQuery = query.toLowerCase();
  const strippedLine = stripMarkdownSyntax(lineContent).toLowerCase();

  const matches: { from: number; to: number; blockText: string }[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;

    const text = node.textContent;
    const lowerText = text.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(lowerQuery, searchFrom);
      if (idx === -1) break;

      matches.push({
        from: pos + 1 + idx,
        to: pos + 1 + idx + query.length,
        blockText: lowerText,
      });

      searchFrom = idx + 1;
    }

    return false;
  });

  if (matches.length === 0) return false;

  let bestMatch = matches[0];
  if (matches.length > 1 && strippedLine) {
    for (const match of matches) {
      if (strippedLine.includes(match.blockText) || match.blockText.includes(strippedLine)) {
        bestMatch = match;
        break;
      }
    }
  }

  applyHighlightAndScroll(view, bestMatch.from, bestMatch.to);

  return true;
}
