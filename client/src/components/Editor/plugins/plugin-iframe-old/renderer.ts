// /* eslint-disable @typescript-eslint/no-magic-numbers */
// import { Emotion, getPalette, Icon, ThemeIcon, ThemeManager, ThemeSize } from '@milkdown/core';

// import { ThemeOptions } from './type';

// import type { Node } from '@milkdown/prose/model';

// const renderer = (manager: ThemeManager, { css }: Emotion) => {
//   const palette = getPalette(manager);
//   return ({ placeholder, isBlock, onError, onLoad }: ThemeOptions) => {
//     const createIcon = (icon: Icon) => manager.get(ThemeIcon, icon)?.dom;

//     const container = document.createElement('span');
//     container.classList.add('iframe-container');

//     manager.onFlush(() => {
//       const style = css`
//         width: 100%;
//         padding: 0 3rem 0 0;
//         position: relative;
//         &::before {
//           content: '';
//           position: absolute;
//           width: 2rem;
//           margin-left: 1rem;
//           height: 100%;
//           right: 0;
//           top: 0;
//           background-color: rgb(55, 52, 52);
//           cursor: pointer;
//         }
//         display: inline-block;
//         position: relative;
//         text-align: center;
//         font-size: 0;
//         vertical-align: text-bottom;
//         line-height: 1;
//         ${isBlock
//           ? `
//                     width: 100%;
//                     margin: 0 auto;
//                     `
//           : ''}
//         &.ProseMirror-selectedNode::after {
//           content: '';
//           background: ${palette('secondary', 0.38)};
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//         }
//         iframe {
//           width: 100%;
//           height: 45rem;
//           border: none;
//         }
//         .icon,
//         .placeholder {
//           display: none;
//         }
//         &.system {
//           width: 100%;
//           padding: 0 2em;
//           font-size: inherit;
//           iframe {
//             width: 0;
//             height: 0;
//             display: none;
//           }
//           .icon,
//           .placeholder {
//             display: inline;
//           }
//           .icon {
//             margin-left: 3rem;
//           }
//           box-sizing: border-box;
//           height: 3em;
//           background-color: ${palette('background')};
//           border-radius: ${manager.get(ThemeSize, 'radius')};
//           display: inline-flex;
//           gap: 2em;
//           justify-content: flex-start;
//           align-items: center;
//           .placeholder {
//             margin: 0;
//             line-height: 1;
//             &::before {
//               content: '';
//               font-size: 0.875em;
//               color: ${palette('neutral', 0.6)};
//             }
//           }
//         }
//         &.empty {
//           .placeholder {
//             &::before {
//               content: '${placeholder}';
//             }
//           }
//         }
//       `;

//       if (style) {
//         container.classList.add(style);
//       }
//     });

//     const content = document.createElement('iframe');

//     container.append(content);
//     let icon = createIcon('link');
//     const $placeholder = document.createElement('span');
//     $placeholder.classList.add('placeholder');
//     container.append(icon, $placeholder);

//     const setIcon = (name: Icon) => {
//       const nextIcon = createIcon(name);
//       container.replaceChild(nextIcon, icon);
//       icon = nextIcon;
//     };

//     const loadIframe = (src: string) => {
//       container.classList.add('system', 'loading');
//       setIcon('loading');
//       const iframe = document.createElement('iframe');
//       iframe.src = src;

//       iframe.onerror = () => {
//         onError?.(iframe);
//       };

//       iframe.onload = () => {
//         onLoad?.(iframe);
//       };
//     };

//     const onUpdate = (node: Node) => {
//       const { src, loading, failed } = node.attrs;
//       content.src = src as string;

//       // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//       if (src.length === 0) {
//         container.classList.add('system', 'empty');
//         setIcon('link');
//         return;
//       }

//       if (loading) {
//         loadIframe(src);
//         return;
//       }

//       if (failed) {
//         container.classList.remove('loading', 'empty');
//         container.classList.add('system', 'failed');
//         setIcon('brokenImage');
//         return;
//       }

//       // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//       if (src.length > 0) {
//         container.classList.remove('system', 'empty', 'loading');
//         return;
//       }

//       container.classList.add('system', 'empty');
//       setIcon('link');
//     };

//     return {
//       dom: container,
//       onUpdate,
//     };
//   };
// };

// export default renderer;
