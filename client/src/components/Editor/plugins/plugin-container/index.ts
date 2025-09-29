/* eslint-disable @typescript-eslint/naming-convention */
import { MilkdownPlugin } from '@milkdown/kit/ctx';
import { wrapIn } from '@milkdown/kit/prose/commands';
import { $nodeSchema, $inputRule, $command, $view } from '@milkdown/utils';
import { wrappingInputRule } from 'prosemirror-inputrules';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ContainerTitle } from './ContainerTitle';
import { ContainerType, ContainerNodeAttrs } from './types';

export * from './types';

export const containerSchema = $nodeSchema('container', () => {
  return {
    content: 'block+',
    group: 'block',
    defining: true,
    attrs: {
      containerType: {
        default: ContainerType.TIP,
        validate: (value) => Object.values(ContainerType).includes(value as ContainerType),
      },
      desc: {
        default: '',
        validate: 'string',
      },
    },
    parseDOM: [
      {
        tag: 'div',
        getAttrs: (dom) => ({
          containerType: dom.getAttribute('data-container-type') ?? ContainerType.TIP,
          desc: dom.getAttribute('data-description') ?? '',
        }),
      },
    ],
    parseMarkdown: {
      match: (node) => {
        return node.type === 'containerDirective' && Object.values(ContainerType).includes(node.name as ContainerType);
      },
      runner: (state, node, type) => {
        state
          .openNode(type, {
            containerType: node.name,
            desc: (node.attributes as ContainerNodeAttrs).desc,
          })
          .next(node.children)
          .closeNode();
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === 'container',
      runner: (state, node) => {
        const attributes: Record<string, string> = {};
        if (node.attrs.desc) {
          attributes.desc = node.attrs.desc;
        }
        state
          .openNode('containerDirective', undefined, {
            name: node.attrs.containerType,
            attributes,
          })
          .next(node.content)
          .closeNode();
      },
    },
  };
});

const containerView = $view(containerSchema.node, () => {
  return (initialNode, view, getPos) => {
    const { containerType, desc } = initialNode.attrs;
    const isDetails = containerType === ContainerType.DETAILS;

    const contentDom = document.createElement('p');
    contentDom.classList.add('milkdown-container-block-content');
    if (isDetails) {
      contentDom.classList.add('container-content-hidden');
    }

    const dom = document.createElement('div');
    dom.classList.add('milkdown-container-block');
    dom.setAttribute('data-container-type', containerType);
    dom.setAttribute('data-description', desc);

    const titleContainerDom = document.createElement('div');
    dom.appendChild(titleContainerDom);
    dom.appendChild(contentDom);

    const titleRoot = createRoot(titleContainerDom);

    const setContainerType = (value: ContainerType) => {
      const pos = getPos();
      if (pos == null) return;
      view.dispatch(view.state.tr.setNodeAttribute(pos, 'containerType', value.toLowerCase()));
    };

    titleRoot.render(
      createElement(ContainerTitle, {
        desc,
        containerType,
        contentDom,
        getReadonly: () => !view.editable,
        setContainerType,
      }),
    );

    return {
      dom,
      contentDOM: contentDom,
      update: (updatedNode) => {
        if (
          updatedNode.type !== initialNode.type ||
          updatedNode.attrs.desc !== desc ||
          updatedNode.attrs.containerType !== containerType
        )
          return false;

        titleRoot.render(
          createElement(ContainerTitle, {
            desc: updatedNode.attrs.desc,
            containerType: updatedNode.attrs.containerType,
            contentDom,
            getReadonly: () => !view.editable,
            setContainerType,
          }),
        );
        return true;
      },
      destroy() {
        titleRoot.unmount();
      },
      ignoreMutation(mutation) {
        if (mutation.type === 'selection' && mutation.target.nodeName === 'SPAN') return false;
        if (mutation.type === 'selection' && (mutation.target as HTMLElement).classList.contains('title-container'))
          return false;
        return true;
      },
    };
  };
});

const containerInputRule = $inputRule((ctx) => {
  return wrappingInputRule(
    /^:::(tip|warning|info|danger|details)\s+([\S\s]+)\s?:::$/,
    containerSchema.type(ctx),
    (match) => ({
      containerType: match[1] || ContainerType.TIP,
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      desc: match[2] || '',
    }),
  );
});

export const wrapInContainerCommand = $command('WrapInContainer', (ctx) => () => wrapIn(containerSchema.type(ctx)));

export const containerPlugin: MilkdownPlugin[] = [containerSchema, containerView, containerInputRule].flat();
