import { MilkdownPlugin } from '@milkdown/kit/ctx';
import { markRule } from '@milkdown/kit/prose';
import { $inputRule, $markSchema, $remark } from '@milkdown/kit/utils';
import { Mark } from 'mdast';

import { showColorPickerCommand, toggleColorPickerCommand } from './commnads';
import { remarkMarkColor } from './remark-mark-color';
import { colorPickTooltipAPI, colorOptionsConfig } from './slices';
import { colorPickTooltip } from './tooltip';

export const DEFAULT_COLOR = '#ffff00';

export const highlightSchema = $markSchema('mark', () => {
  return {
    attrs: {
      color: {
        default: DEFAULT_COLOR,
        validate: 'string',
      },
    },
    parseDOM: [
      {
        tag: 'mark',
        getAttrs: (node: HTMLElement) => {
          return {
            color: node.style.backgroundColor,
          };
        },
      },
    ],
    toDOM: (mark) => ['mark', { style: `background-color: ${mark.attrs.color as string}` }],
    parseMarkdown: {
      match: (node) => node.type === 'mark',
      runner: (state, node, markType) => {
        const color = (node as Mark).data?.color;
        state.openMark(markType, { color });
        state.next(node.children);
        state.closeMark(markType);
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === 'mark',
      runner: (state, mark) => {
        let color = mark.attrs.color;
        if (color?.toLowerCase() === DEFAULT_COLOR.toLowerCase()) {
          color = undefined;
        }
        state.withMark(mark, 'mark', undefined, {
          data: { color },
        });
      },
    },
  };
});

export const highlightInputRule = $inputRule((ctx) => {
  return markRule(/(?:==)(?:\{([^}]+)\})?([^=]+)(?:==)$/, highlightSchema.type(ctx), {
    getAttr: (match) => {
      const color = match[1];
      return {
        color: color || null,
      };
    },
  });
});

const markRemark = $remark('highlightColor', () => remarkMarkColor);

export const highlightMarkerPlugin: MilkdownPlugin[] = [
  highlightSchema,
  highlightInputRule,
  markRemark,
  colorPickTooltip,
  colorPickTooltipAPI,
  colorOptionsConfig,
  toggleColorPickerCommand,
  showColorPickerCommand,
].flat();

export * from './configration';
export * from './slices';
export * from './commnads';
