import { highlightMark } from 'micromark-extension-highlight-mark';
import { visit } from 'unist-util-visit';

import type { Parent, Root, RootContent } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Handle, Options as ToMarkdownExtension } from 'mdast-util-to-markdown';
import type { Extension as MicromarkExtension, Token } from 'micromark-util-types';
import type { Data, Processor } from 'unified';

declare module 'mdast-util-to-markdown' {
  interface ConstructNameMap {
    mark: 'mark';
  }
}

declare module 'mdast' {
  export interface Mark extends Parent {
    type: 'mark';
    data: { color?: string };
    children: PhrasingContent[];
  }
  export interface StaticPhrasingContentMap {
    mark: Mark;
  }
  interface PhrasingContentMap {
    mark: Mark;
  }
  interface RootContentMap {
    mark: Mark;
  }
}

function add(
  data: Data,
  field: 'fromMarkdownExtensions' | 'micromarkExtensions' | 'toMarkdownExtensions',
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  value: FromMarkdownExtension | FromMarkdownExtension[] | MicromarkExtension | ToMarkdownExtension,
) {
  // @ts-expect-error extension arrays are intentionally supplied by the plugin
  const list = (data[field] = data[field] ?? []);
  if (Array.isArray(value)) {
    for (const item of value) if (!list.includes(item)) list.push(item);
  } else if (!list.includes(value)) list.push(value);
}

const handleMarkColor: Handle = (node, _, state, info) => {
  const marker = '==';
  const tracker = state.createTracker(info);
  const exit = state.enter('mark');
  let value = tracker.move(marker);
  if (node.data?.color) value += tracker.move(`{${node.data.color as string}}`);
  value += tracker.move(state.containerPhrasing(node, { before: value, after: marker, ...tracker.current() }));
  value += tracker.move(marker);
  exit();
  return value;
};

const markColorToMarkdown: ToMarkdownExtension = {
  unsafe: [
    {
      character: '=',
      inConstruct: 'phrasing',
      notInConstruct: [
        'autolink',
        'destinationLiteral',
        'destinationRaw',
        'reference',
        'titleQuote',
        'titleApostrophe',
      ],
    },
  ],
  handlers: { mark: handleMarkColor },
};

function enterMark(this: CompileContext, token: Token) {
  this.enter({ type: 'mark', children: [], data: {} }, token);
}

function exitMark(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as Parent;
  if (node?.children?.length) {
    const first = node.children[0];
    if (first?.type === 'text') {
      const match = /^\{([^}]+)\}/.exec(first.value);
      if (match) {
        node.data = { ...(node.data ?? {}), color: match[1] };
        first.value = first.value.slice(match[0].length);
        if (!first.value.length) node.children.shift();
      }
    }
  }
  this.exit(token);
}

const markColorFromMarkdown: FromMarkdownExtension = {
  canContainEols: ['mark'],
  enter: { highlight: enterMark },
  exit: { highlight: exitMark },
};

export function remarkMarkColor(this: Processor) {
  const data = this.data();
  add(data, 'micromarkExtensions', highlightMark());
  add(data, 'fromMarkdownExtensions', markColorFromMarkdown);
  add(data, 'toMarkdownExtensions', markColorToMarkdown);
  return (tree: Root) => {
    visit(tree, 'highlight', (node: Parent & RootContent, index: number, parent: Parent) => {
      if (!parent) return;
      const first = node.children[0];
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let color: string | undefined;
      if (first?.type === 'text') {
        const match = /^\{([^}]+)\}/.exec(first.value);
        if (match) {
          color = match[1];
          first.value = first.value.slice(match[0].length);
          if (!first.value.length) node.children.shift();
        }
      }
      node.type = 'mark';
      if (color) node.data = { ...node.data, color };
      parent.children[index] = node;
    });
  };
}
