// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import * as emotion from '@emotion/css';
// import { RemarkPlugin, createCmdKey, createCmd, ThemeInputChipType, commandsCtx } from '@milkdown/core';
// import { findSelectedNodeOfType, NodeViewFactory } from '@milkdown/prose';
// import { Plugin, PluginKey } from '@milkdown/prose/state';
// import { EditorView } from '@milkdown/prose/view';
// import { AtomList, createNode } from '@milkdown/utils';
// import { InputRule } from 'prosemirror-inputrules';
// import directive from 'remark-directive';

// import getIframeRenderer from './renderer';
// import { IframeOptions } from './type';
// export const InsertIframe = createCmdKey<string>('InsertIframe');
// export const ModifyIframe = createCmdKey<string>('ModifyIframe');

// const key = new PluginKey('MILKDOWN_IFRAME_INPUT');

// const id = 'iframe';
// const iframe = createNode<string, IframeOptions>((utils, options) => {
//   return {
//     id,
//     schema: () => ({
//       attrs: {
//         src: { default: null },
//       },
//       group: 'inline',
//       inline: true,
//       marks: '',
//       atom: true,
//       parseDOM: [
//         {
//           tag: 'iframe',
//           getAttrs: (dom) => {
//             if (!(dom instanceof HTMLElement)) {
//               throw new Error();
//             }
//             return {
//               src: dom.getAttribute('src'),
//             };
//           },
//         },
//       ],
//       toDOM: (node) => {
//         const div = document.createElement('div');
//         div.classList.add('iframe-click');
//         div.innerText = 'click';

//         return ['iframe', { ...node.attrs, class: 'iframe' }];
//       },
//       parseMarkdown: {
//         match: (node) => {
//           return node.type === 'textDirective' && node.name === 'iframe';
//         },
//         runner: (state, node, type) => {
//           state.addNode(type, {
//             src: (node.attributes as { src: string }).src,
//           });
//         },
//       },
//       toMarkdown: {
//         match: (node) => node.type.name === id,
//         runner: (state, node) => {
//           state.addNode('textDirective', undefined, undefined, {
//             name: 'iframe',
//             attributes: {
//               src: node.attrs.src as string,
//             },
//           });
//         },
//       },
//     }),
//     inputRules: (nodeType) => [
//       new InputRule(
//         // :iframe{src="url"}
//         /:iframe\{src="(?<src>[^"]+)?"?\}/,
//         (state, match, start, end) => {
//           const [okay, src = ''] = match;
//           const { tr } = state;
//           if (okay) {
//             tr.replaceWith(start, end, nodeType.create({ src }));
//           }

//           return tr;
//         },
//       ),
//     ],
//     commands: (type) => [
//       createCmd(InsertIframe, (src = '') => (state: any, dispatch: any) => {
//         if (!dispatch) return true;
//         const { tr } = state;
//         const node = type.create({ src });
//         if (!node) {
//           return true;
//         }
//         // eslint-disable-next-line @typescript-eslint/naming-convention
//         const _tr = tr.replaceSelectionWith(node);
//         dispatch(_tr.scrollIntoView());
//         return true;
//       }),
//       createCmd(ModifyIframe, (src = '') => (state: any, dispatch: any) => {
//         const node = findSelectedNodeOfType(state.selection, type);
//         if (!node) return false;

//         const { tr } = state;
//         dispatch?.(
//           tr
//             .setNodeMarkup(node.pos, undefined, {
//               ...node.node.attrs,
//               loading: true,
//               src,
//             })
//             .scrollIntoView(),
//         );

//         return true;
//       }),
//     ],
//     view: () =>
//       ((node) => {
//         let currNode = node;

//         const placeholder = options?.placeholder ?? 'Add an Iframe';
//         const isBlock = options?.isBlock ?? false;

//         const renderer = getIframeRenderer(
//           utils.themeManager,
//           emotion,
//         )({
//           placeholder,
//           isBlock,
//         });

//         if (!renderer) {
//           return {};
//         }

//         const { dom, onUpdate } = renderer;
//         onUpdate(currNode);

//         return {
//           dom,
//           update: (updatedNode) => {
//             if (updatedNode.type.name !== id) return false;

//             currNode = updatedNode;
//             onUpdate(currNode);

//             return true;
//           },
//           selectNode: () => {
//             dom.classList.add('ProseMirror-selectedNode');
//           },
//           deselectNode: () => {
//             dom.classList.remove('ProseMirror-selectedNode');
//           },
//         };
//       }) as NodeViewFactory,
//     prosePlugins: (type, ctx) => {
//       return [
//         new Plugin({
//           key,
//           view: (editorView) => {
//             const inputChipRenderer = utils.themeManager.get<ThemeInputChipType>('input-chip', {
//               placeholder: options?.input?.placeholder ?? 'Input Iframe Link',
//               buttonText: options?.input?.buttonText,
//               onUpdate: (value) => {
//                 ctx.get(commandsCtx).call(ModifyIframe, value);
//               },
//             });
//             if (!inputChipRenderer) return {};
//             const shouldDisplay = (view: EditorView) => {
//               return Boolean(view.hasFocus() && type && findSelectedNodeOfType(view.state.selection, type));
//             };
//             const getCurrentLink = (view: EditorView) => {
//               const result = findSelectedNodeOfType(view.state.selection, type);
//               if (!result) return;

//               const value = result.node.attrs.src;
//               return value as string;
//             };
//             const renderByView = (view: EditorView) => {
//               if (!view.editable) {
//                 return;
//               }
//               const display = shouldDisplay(view);
//               if (display) {
//                 inputChipRenderer.show(view);
//                 inputChipRenderer.update(getCurrentLink(view) ?? '');
//               } else {
//                 inputChipRenderer.hide();
//               }
//             };
//             inputChipRenderer.init(editorView);
//             renderByView(editorView);

//             return {
//               update: (view, prevState) => {
//                 const isEqualSelection =
//                   prevState?.doc.eq(view.state.doc) && prevState.selection.eq(view.state.selection);
//                 if (isEqualSelection) return;

//                 renderByView(view);
//               },
//               destroy: () => {
//                 inputChipRenderer.destroy();
//               },
//             };
//           },
//         }),
//       ];
//     },
//     remarkPlugins: () => [directive as RemarkPlugin],
//   };
// });

// export default AtomList.create([iframe()]);
