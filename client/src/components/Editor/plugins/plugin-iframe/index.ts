import { MilkdownPlugin } from '@milkdown/kit/ctx';
import { $remark, $nodeSchema, $inputRule, $view } from '@milkdown/kit/utils';
import { InputRule } from 'prosemirror-inputrules';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import directive from 'remark-directive';

import { IframeView } from './IframeView';

const remarkPluginId = 'Iframe';
const remarkDirective = $remark(remarkPluginId, () => directive);

export const iframeBlockSchema = $nodeSchema('iframe', () => ({
  group: 'block', // Block-level node
  atom: true, // Cannot be split
  isolating: true, // Cannot be merged with adjacent nodes
  marks: '', // No marks allowed
  attrs: {
    src: { default: 'https://example.com' }, // URL attribute
  },
  defining: true,
  code: true,
  parseDOM: [
    {
      tag: 'iframe',
      getAttrs: (dom) => ({
        src: dom.getAttribute('src'),
      }),
    },
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

const iframeView = $view(iframeBlockSchema.node, () => {
  return (initialNode, view, getPos) => {
    const dom = document.createElement('div');
    const root = createRoot(dom);

    const setAttrs = ({ src }: { src: string }) => {
      if (!view.editable) return;
      const pos = getPos();
      if (pos == null) return;
      view.dispatch(view.state.tr.setNodeAttribute(pos, 'src', src));
    };

    root.render(createElement(IframeView, { readonly: !view.editable, src: initialNode.attrs.src, setAttrs }));

    return {
      dom,
      update: (updatedNode) => {
        if (updatedNode.type !== initialNode.type) return false;

        root.render(createElement(IframeView, { readonly: !view.editable, src: updatedNode.attrs.src, setAttrs }));
        return true;
      },
      destroy() {
        root.unmount();
      },
    };
  };
});

const iframeInputRule = $inputRule(
  (ctx) =>
    new InputRule(/:iframe\{src="(?<src>[^"]+)?"?\}/, (state, match, start, end) => {
      const [okay, src = ''] = match;
      const { tr } = state;
      if (okay) {
        tr.replaceWith(start - 1, end, iframeBlockSchema.type(ctx).create({ src }));
      }
      return tr;
    }),
);

export const iframePlugin: MilkdownPlugin[] = [remarkDirective, iframeBlockSchema, iframeView, iframeInputRule].flat();
