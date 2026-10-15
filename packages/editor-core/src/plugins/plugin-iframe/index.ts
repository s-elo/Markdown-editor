import { MilkdownPlugin } from '@milkdown/kit/ctx';
import { $inputRule, $nodeSchema, $remark, $view } from '@milkdown/kit/utils';
import { InputRule } from 'prosemirror-inputrules';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import directive from 'remark-directive';

import { IframeView } from './IframeView';

const remarkDirective = $remark('Iframe', () => directive);

export const iframeBlockSchema = $nodeSchema('iframe', () => ({
  group: 'block',
  atom: true,
  isolating: true,
  marks: '',
  attrs: { src: { default: 'https://example.com' } },
  defining: true,
  code: true,
  parseDOM: [{ tag: 'iframe', getAttrs: (dom) => ({ src: dom.getAttribute('src') }) }],
  parseMarkdown: {
    match: (node) => node.type === 'leafDirective' && node.name === 'iframe',
    runner: (state, node, type) => state.addNode(type, { src: (node.attributes as { src: string }).src }),
  },
  toMarkdown: {
    match: (node) => node.type.name === 'iframe',
    runner: (state, node) =>
      state.addNode('leafDirective', undefined, undefined, {
        name: 'iframe',
        attributes: { src: node.attrs.src },
      }),
  },
}));

const iframeView = $view(iframeBlockSchema.node, () => (initialNode, view, getPos) => {
  const dom = document.createElement('div');
  dom.style.borderRadius = '5px';
  const root = createRoot(dom);
  const setAttrs = ({ src }: { src: string }) => {
    if (!view.editable) return;
    const pos = getPos();
    if (pos == null) return;
    view.dispatch(view.state.tr.setNodeAttribute(pos, 'src', src));
  };
  const render = (src: string) => {
    root.render(createElement(IframeView, { readonly: !view.editable, src, setAttrs }));
  };
  render(initialNode.attrs.src);
  return {
    dom,
    update: (updatedNode) => {
      if (updatedNode.type !== initialNode.type) return false;
      render(updatedNode.attrs.src);
      return true;
    },
    destroy() {
      root.unmount();
    },
  };
});

const iframeInputRule = $inputRule(
  (ctx) =>
    new InputRule(/:iframe\{src="(?<src>[^"]+)?"?\}/, (state, match, start, end) => {
      const [okay, src = ''] = match;
      const { tr } = state;
      if (okay) tr.replaceWith(start - 1, end, iframeBlockSchema.type(ctx).create({ src }));
      return tr;
    }),
);

export const iframePlugin: MilkdownPlugin[] = [remarkDirective, iframeBlockSchema, iframeView, iframeInputRule].flat();
