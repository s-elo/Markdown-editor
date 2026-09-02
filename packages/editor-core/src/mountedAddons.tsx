/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Decoration, DecorationSet, type EditorView } from '@milkdown/kit/prose/view';

import { throttle } from './utils';

export interface EditorAddonOptions {
  readonly: boolean;
  initialScrollTop?: number;
  getScrollContainer?: () => HTMLElement | null;
  getMirrorContainer?: () => HTMLElement | null;
  onScroll?: (scrollTop: number) => void;
  onAnchorChange?: (anchor: string) => void;
  onBlurChange?: (isBlurred: boolean) => void;
}

let removers: (() => void)[] = [];

export function removeEvents() {
  removers.forEach((remove) => {
    remove();
  });
  removers = [];
}

function scrollToAnchor(anchor: string, getScrollContainer?: () => HTMLElement | null) {
  const element = document.getElementById(anchor);
  const container = getScrollContainer?.();
  if (element && container) container.scrollTo({ top: element.offsetTop, behavior: 'auto' });
}

function syncAnchor(onAnchorChange?: (anchor: string) => void) {
  document.querySelectorAll('.milkdown-heading').forEach((heading) => {
    const rect = heading.getBoundingClientRect();
    if (rect.top > 0 && rect.top < 150) onAnchorChange?.(heading.id);
  });
}

export function mountEditorAddons(options: EditorAddonOptions) {
  removeEvents();
  const scrollContainer = options.getScrollContainer?.();
  if (scrollContainer) {
    scrollContainer.scrollTop = options.initialScrollTop ?? 0;
    const onScroll = throttle(() => {
      options.onScroll?.(scrollContainer.scrollTop);
      syncAnchor(options.onAnchorChange);
    }, 100);
    scrollContainer.addEventListener('scroll', onScroll);
    removers.push(() => {
      scrollContainer.removeEventListener('scroll', onScroll);
    });
    setTimeout(() => {
      syncAnchor(options.onAnchorChange);
    }, 100);
  }

  const editorDom = document.querySelector('.milkdown');
  if (editorDom) {
    const enter = () => options.onBlurChange?.(false);
    const leave = () => options.onBlurChange?.(true);
    editorDom.addEventListener('mouseenter', enter);
    editorDom.addEventListener('mouseleave', leave);
    removers.push(() => {
      editorDom.removeEventListener('mouseenter', enter);
      editorDom.removeEventListener('mouseleave', leave);
    });
  }

  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (hash) scrollToAnchor(hash, options.getScrollContainer);
  options.onAnchorChange?.(hash);
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (options.readonly) syncMirror(options.getMirrorContainer);
}

export function syncMirror(getMirrorContainer?: () => HTMLElement | null) {
  const editorDom = document.querySelector('.milkdown .editor');
  const mirror = getMirrorContainer?.() ?? document.querySelector('.code-mirror-container .cm-content')?.parentElement;
  if (!editorDom || !mirror) return;
  const blocks = [...editorDom.children] as HTMLElement[];
  const lines = blocks.map((_, index) => {
    let line = 0;
    for (let i = 0; i < index; i++) line += blocks[i].innerText.split('\n').length + 1;
    return line;
  });
  blocks.forEach((block, index) => {
    const onDoubleClick = (event: MouseEvent) => {
      const line = [...mirror.querySelectorAll('.cm-line')][lines[index]] as HTMLElement | undefined;
      if (!line) return;
      const height = Number.parseFloat(getComputedStyle(line).height);
      const scroller = mirror.closest('.cm-scroller');
      scroller?.scrollTo({ top: Math.max(0, (lines[index] - 3) * height), behavior: 'smooth' });
      event.stopPropagation();
    };
    block.addEventListener('dblclick', onDoubleClick);
    removers.push(() => {
      block.removeEventListener('dblclick', onDoubleClick);
    });
  });
}

const HIGHLIGHT_DURATION_MS = 3500;

export function applyHighlightAndScroll(
  view: EditorView,
  from: number,
  to: number,
  getScrollContainer?: () => HTMLElement | null,
) {
  const container = getScrollContainer?.();
  if (container) {
    try {
      const coords = view.coordsAtPos(from);
      const rect = container.getBoundingClientRect();
      container.scrollTo({ top: container.scrollTop + coords.top - rect.top - rect.height / 3, behavior: 'instant' });
    } catch {
      // The editor may still be mounting.
    }
  }
  view.setProps({
    decorations: (state) =>
      DecorationSet.create(state.doc, [Decoration.inline(from, to, { class: 'search-match-highlight' })]),
  });
  setTimeout(() => {
    if (view.dom.isConnected) view.setProps({ decorations: () => DecorationSet.empty });
  }, HIGHLIGHT_DURATION_MS);
}

const stripMarkdownSyntax = (text: string) =>
  text
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

export function searchAndHighlight(
  view: EditorView,
  query: string,
  lineContent: string,
  getScrollContainer?: () => HTMLElement | null,
) {
  if (!query) return false;
  const lowerQuery = query.toLowerCase();
  const line = stripMarkdownSyntax(lineContent).toLowerCase();
  const matches: { from: number; to: number; blockText: string }[] = [];
  view.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textContent.toLowerCase();
    let start = 0;
    while (start < text.length) {
      const index = text.indexOf(lowerQuery, start);
      if (index === -1) break;
      matches.push({ from: pos + 1 + index, to: pos + 1 + index + query.length, blockText: text });
      start = index + 1;
    }
    return false;
  });
  if (!matches.length) return false;
  const match =
    matches.find((item) => line && (line.includes(item.blockText) || item.blockText.includes(line))) ?? matches[0];
  applyHighlightAndScroll(view, match.from, match.to, getScrollContainer);
  return true;
}
