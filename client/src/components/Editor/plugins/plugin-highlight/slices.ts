import { Mark } from '@milkdown/kit/prose/model';
import { $ctx } from '@milkdown/utils';

import { ColorOptions } from './view/ColorPicker';

export interface ColorPickTooltipAPI {
  addColorPicker: (mark: Mark | null, from: number, to: number) => void;
  removeColorPicker: (from: number, to: number) => void;
}

const defaultAPI: ColorPickTooltipAPI = {
  addColorPicker: () => {
    //...
  },
  removeColorPicker: () => {
    //...
  },
};

export const colorPickTooltipAPI = $ctx({ ...defaultAPI }, 'colorPickTooltipAPICtx');

export const defaultColorOptions: ColorOptions[] = [
  {
    label: 'Background',
    code: 'BG',
    items: [
      {
        label: 'Default',
        value: 'default',
      },
      {
        label: 'Red',
        value: '#fed5d5',
      },
      {
        label: 'Orange',
        value: '#fedfbb',
      },
      {
        label: 'Yellow',
        value: '#fef3a1',
      },
      {
        label: 'Green',
        value: '#e1fab1',
      },
      {
        label: 'Teal',
        value: '#adf8e9',
      },
      {
        label: 'Blue',
        value: '#cce2fe',
      },
      {
        label: 'Purple',
        value: '#edddff',
      },
      {
        label: 'Grey',
        value: '#eaecef',
      },
    ],
  },
];

export const colorOptionsConfig = $ctx(defaultColorOptions, 'colorOptionsCtx');
