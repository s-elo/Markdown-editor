import { MilkdownPlugin } from '@milkdown/kit/ctx';
import { Node } from '@milkdown/kit/prose/model';
import { $remark, $node, $inputRule } from '@milkdown/kit/utils';
import { InputRule } from 'prosemirror-inputrules';
import directive from 'remark-directive';

const remarkPluginId = 'Iframe';
const remarkDirective = $remark(remarkPluginId, () => directive);

const iframeNode = $node('iframe', () => ({
  group: 'block', // Block-level node
  atom: true, // Cannot be split
  isolating: true, // Cannot be merged with adjacent nodes
  marks: '', // No marks allowed
  attrs: {
    src: { default: null }, // URL attribute
  },
  parseDOM: [
    {
      tag: 'iframe',
      getAttrs: (dom) => ({
        src: dom.getAttribute('src'),
      }),
    },
  ],
  toDOM: (node: Node) => [
    'div',
    { class: 'iframe-plugin-container' },
    [
      'a',
      { class: 'iframe-plugin-link', href: node.attrs.src, contenteditable: false, target: '_blank' },
      [
        'span',
        {
          class: 'material-icons-outlined icon-btn',
        },
        'open_in_new',
      ],
      'Open Iframe',
    ],
    [
      'iframe',
      {
        ...node.attrs,
        contenteditable: false,
        class: 'iframe-plugin',
      },
      0,
    ],
  ],
  parseMarkdown: {
    match: (node) => node.type === 'leafDirective' && node.name === 'iframe',
    runner: (state, node, type) => {
      state.addNode(type, { src: (node.attributes as { src: string }).src });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'iframe',
    runner: (state, node) => {
      state.addNode('leafDirective', undefined, undefined, {
        name: 'iframe',
        attributes: { src: node.attrs.src },
      });
    },
  },
}));

const iframeInputRule = $inputRule(
  (ctx) =>
    new InputRule(/:iframe\{src="(?<src>[^"]+)?"?\}/, (state, match, start, end) => {
      const [okay, src = ''] = match;
      const { tr } = state;
      if (okay) {
        tr.replaceWith(start - 1, end, iframeNode.type(ctx).create({ src }));
      }
      return tr;
    }),
);

export const iframePlugin: MilkdownPlugin[] = [remarkDirective, iframeNode, iframeInputRule].flat();
