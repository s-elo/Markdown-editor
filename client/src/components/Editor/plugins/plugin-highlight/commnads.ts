import { Mark } from '@milkdown/kit/prose/model';
import { $command } from '@milkdown/utils';

import { highlightSchema } from './index';
import { colorPickTooltipAPI } from './slices';

export const toggleColorPickerCommand = $command('ToggleColorPicker', (ctx) => {
  return () => (state) => {
    const {
      doc,
      selection: { from, to },
    } = state;
    const markType = highlightSchema.type(ctx);
    const hasColorPicker = doc.rangeHasMark(from, to, markType);
    if (hasColorPicker) {
      ctx.get(colorPickTooltipAPI.key).removeColorPicker(from, to);
      return true;
    }

    let mark: Mark | null = null;
    doc.nodesBetween(from, to, (node) => {
      if (!markType.isInSet(node.marks)) return;
      mark = node.marks.find((m) => m.type === markType) ?? null;
    });

    ctx.get(colorPickTooltipAPI.key).addColorPicker(mark, from, to);
    return true;
  };
});

export const showColorPickerCommand = $command('ToggleColorPicker', (ctx) => {
  return () => (state) => {
    const {
      doc,
      selection: { from, to },
    } = state;

    const markType = highlightSchema.type(ctx);
    let mark: Mark | null = null;
    doc.nodesBetween(from, to, (node) => {
      if (!markType.isInSet(node.marks)) return;
      mark = node.marks.find((m) => m.type === markType) ?? null;
    });

    ctx.get(colorPickTooltipAPI.key).addColorPicker(mark, from, to);

    return true;
  };
});
