import { editorViewCtx } from '@milkdown/kit/core';
import { TooltipProvider } from '@milkdown/kit/plugin/tooltip';
import { posToDOMRect } from '@milkdown/kit/prose';
import { TextSelection } from '@milkdown/kit/prose/state';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ColorPicker } from './ColorPicker';
import { colorOptionsConfig, highlightSchema } from '..';

import type { Ctx } from '@milkdown/kit/ctx';
import type { Mark } from '@milkdown/kit/prose/model';
import type { PluginView } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';

import './ColorPicker.scss';

interface Data {
  from: number;
  to: number;
  mark: Mark | null;
}

const defaultData: Data = {
  from: -1,
  to: -1,
  mark: null,
};

export class ColorPickerTooltip implements PluginView {
  #content: HTMLElement;

  #provider: TooltipProvider;

  #data: Data = { ...defaultData };

  #root: Root;

  // #color: string;

  constructor(private readonly ctx: Ctx, view: EditorView) {
    const content = document.createElement('div');
    content.className = 'milkdown-color-picker';

    this.#content = content;

    this.#root = createRoot(content);
    this.#root.render(
      createElement(ColorPicker, {
        onColorChange: this.#onColorChange,
        initialColor: '',
        colorOptions: [],
      }),
    );

    this.#provider = new TooltipProvider({
      content,
      floatingUIOptions: {
        placement: 'bottom',
      },
      debounce: 0,
      shouldShow: () => false,
    });
    this.#provider.onHide = () => {
      requestAnimationFrame(() => {
        view.dom.focus({ preventScroll: true });
      });
    };
    this.#provider.update(view);
  }

  public update = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    if (!(selection instanceof TextSelection)) return;
    const { from, to } = selection;
    if (from === this.#data.from && to === this.#data.to) return;

    this.#reset();
  };

  public destroy = () => {
    this.#provider.destroy();
    this.#content.remove();
  };

  public show = (mark: Mark | null, from: number, to: number) => {
    this.#data = {
      from,
      to,
      mark,
    };
    // this.#color = mark.attrs.color;
    const view = this.ctx.get(editorViewCtx);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
    this.#root.render(
      createElement(ColorPicker, {
        onColorChange: this.#onColorChange,
        initialColor: mark?.attrs.color ?? '',
        colorOptions: this.ctx.get(colorOptionsConfig.key),
      }),
    );
    this.#provider.show({
      getBoundingClientRect: () => posToDOMRect(view, from, to),
    });
  };

  public remove = (from: number, to: number) => {
    const view = this.ctx.get(editorViewCtx);

    const tr = view.state.tr;
    tr.removeMark(from, to, highlightSchema.type(this.ctx));
    view.dispatch(tr);

    this.#reset();
  };

  #reset = () => {
    this.#provider.hide();
    this.#data = { ...defaultData };
  };

  #onColorChange = (color: string) => {
    const { from, to, mark } = this.#data;

    if (color === 'default') {
      this.#reset();
      this.remove(from, to);
      return;
    }

    const view = this.ctx.get(editorViewCtx);
    const type = highlightSchema.type(this.ctx);
    if (mark?.attrs?.color === color) {
      this.#reset();
      return;
    }

    const tr = view.state.tr;
    if (mark) tr.removeMark(from, to, mark);

    tr.addMark(from, to, type.create({ color }));
    view.dispatch(tr);

    this.#reset();
  };
}
