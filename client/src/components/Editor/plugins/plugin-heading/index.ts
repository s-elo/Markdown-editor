import { MilkdownPlugin } from '@milkdown/kit/ctx';
import { headingAttr, headingSchema } from '@milkdown/kit/preset/commonmark';
import { $view } from '@milkdown/utils';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { Anchor } from './Anchor';

import { store } from '@/store';
import { headerToId } from '@/utils/utils';

export const headingView = $view(headingSchema.node, (ctx) => {
  return (initialNode) => {
    const dom = document.createElement(`h${initialNode.attrs.level as string}`);
    const attrs = {
      ...ctx.get(headingAttr.key)(initialNode),
      id: initialNode.attrs.id || headerToId(initialNode.textContent),
    };
    Object.entries(attrs).forEach(([key, value]) => {
      dom.setAttribute(key, value as string);
    });
    dom.classList.add('milkdown-heading');

    const contentDom = document.createElement('span');
    contentDom.textContent = initialNode.textContent;
    dom.appendChild(contentDom);

    const anchorContainer = document.createElement('div');
    anchorContainer.classList.add('heading-anchor-container');
    dom.appendChild(anchorContainer);
    const root = createRoot(anchorContainer);

    root.render(
      createElement(Provider, {
        store: store,
        children: createElement(Anchor, { id: initialNode.attrs.id as string, text: initialNode.textContent }),
      }),
    );

    return {
      dom,
      contentDOM: contentDom,
      update: (updatedNode) => {
        if (updatedNode.type !== initialNode.type) return false;

        dom.setAttribute('id', updatedNode.attrs.id);
        root.render(
          createElement(Provider, {
            store: store,
            children: createElement(Anchor, { id: updatedNode.attrs.id as string, text: updatedNode.textContent }),
          }),
        );
        return true;
      },
      destroy() {
        root.unmount();
      },
      ignoreMutation(mutation) {
        if (
          mutation.type === 'childList' &&
          (mutation.target as HTMLElement).classList.contains('heading-anchor-container')
        )
          return true;
        return false;
      },
    };
  };
});

export const headingPlugin: MilkdownPlugin[] = [headingView].flat();
