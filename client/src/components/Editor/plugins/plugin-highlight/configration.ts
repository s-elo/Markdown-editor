import { colorPickTooltipAPI } from './slices';
import { colorPickTooltip } from './tooltip';
import { ColorPickerTooltip } from './view';

import type { Ctx } from '@milkdown/kit/ctx';

export function configureColorPicker(ctx: Ctx) {
  let colorPickerTooltipView: ColorPickerTooltip | null = null;

  ctx.update(colorPickTooltipAPI.key, (api) => ({
    ...api,
    addColorPicker: (mark, from, to) => {
      colorPickerTooltipView?.show(mark, from, to);
    },
    removeColorPicker: (from, to) => {
      colorPickerTooltipView?.remove(from, to);
    },
  }));

  ctx.set(colorPickTooltip.key, {
    view: (view) => {
      colorPickerTooltipView = new ColorPickerTooltip(ctx, view);
      return colorPickerTooltipView;
    },
  });
}
