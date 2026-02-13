import { Editor, editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/kit/core';
import { Ctx } from '@milkdown/kit/ctx';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import { Slice } from '@milkdown/kit/prose/model';
import { Milkdown, useEditor } from '@milkdown/react';
import { FC, useImperativeHandle } from 'react';

import { getCrepe } from './crepe';
import { headingConfig } from './plugins/plugin-heading';

import { scrollToEditorAnchor } from '@/utils/hooks/docHooks';
import { updateLocationHash } from '@/utils/utils';

export interface CrepeEditorRef {
  update: (newContent: string) => void;
  get: () => Editor | undefined;
}

export interface CrepeEditorProps {
  /** default as "" */
  defaultValue?: string;
  /** default as false */
  isDarkMode?: boolean;
  /** default as false */
  readonly?: boolean;
  /** used to trigger reser the editor */
  resetMark?: unknown;
  onMounted?: (ctx: Ctx) => void;
  onUpdated?: (ctx: Ctx, markdown: string) => void;
  onToAnchor?: (id: string) => void;

  ref: React.RefObject<CrepeEditorRef | null>;
}

export const CrepeEditor: FC<CrepeEditorProps> = ({
  defaultValue = '',
  isDarkMode = false,
  readonly = false,
  resetMark,
  onMounted,
  onUpdated,
  onToAnchor,
  ref: editorWrappedRef,
}) => {
  const { get } = useEditor(
    (root) => {
      const crepe = getCrepe({
        root,
        defaultValue,
        isDarkMode,
      });

      crepe.editor.config((ctx) => {
        ctx
          .get(listenerCtx)
          .mounted(() => {
            onMounted?.(ctx);
          })
          .markdownUpdated((_, markdown) => {
            onUpdated?.(ctx, markdown);
          });

        // edit mode
        ctx.set(editorViewOptionsCtx, {
          editable: () => !readonly,
        });

        ctx.set(headingConfig.key, {
          toAnchor: (id: string) => {
            updateLocationHash(id);
            scrollToEditorAnchor(id);
            onToAnchor?.(id);
          },
        });
      });

      return crepe;
    },
    [resetMark, isDarkMode, readonly],
  );

  // for update the editor using a wrapped ref
  useImperativeHandle(editorWrappedRef, () => ({
    get,
    update: (markdown: string) => {
      const editor = get();
      if (!editor) return;

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const parser = ctx.get(parserCtx);
        const doc = parser(markdown);
        if (!doc) return;

        const state = view.state;
        view.dispatch(state.tr.replace(0, state.doc.content.size, new Slice(doc.content, 0, 0)));
      });
    },
  }));

  return <Milkdown></Milkdown>;
};
