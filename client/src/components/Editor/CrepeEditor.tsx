import { Editor, editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/kit/core';
import { Ctx } from '@milkdown/kit/ctx';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import { Slice } from '@milkdown/kit/prose/model';
import { Milkdown, useEditor } from '@milkdown/react';
import { FC, useEffect, useImperativeHandle, useReducer, useRef } from 'react';

import { getCrepe } from './crepe';
import { headingConfig } from './plugins/plugin-heading';

import { scrollToEditorAnchor } from '@/utils/hooks/docHooks';
import { updateLocationHash } from '@/utils/utils';

export interface CrepeEditorRef {
  update: (newContent: string) => void;
  get: () => Editor | undefined;
  /** used to trigger reser the editor */
  reRender: () => void;
}

export interface CrepeEditorProps {
  /** default as "" */
  defaultValue?: string;
  /** default as false */
  isDarkMode?: boolean;
  /** default as false */
  readonly?: boolean;
  onMounted?: (ctx: Ctx) => void;
  onUpdated?: (ctx: Ctx, markdown: string) => void;
  onToAnchor?: (id: string) => void;

  ref: React.RefObject<CrepeEditorRef | null>;
}

export const CrepeEditor: FC<CrepeEditorProps> = ({
  defaultValue = '',
  isDarkMode = false,
  readonly = false,
  onMounted,
  onUpdated,
  onToAnchor,
  ref: editorWrappedRef,
}) => {
  const [reRenderMarker, reRender] = useReducer((x) => x + 1, 0);

  // This is used to avoid the closure issue
  // when hook functions from props are updated but editor is not reset
  const hookRefs = useRef<{
    onUpdated: CrepeEditorProps['onUpdated'];
    onMounted: CrepeEditorProps['onMounted'];
    onToAnchor: CrepeEditorProps['onToAnchor'];
  }>({
    onUpdated: (...args) => {
      onUpdated?.(...args);
    },
    onMounted: (...args) => {
      onMounted?.(...args);
    },
    onToAnchor: (...args) => {
      onToAnchor?.(...args);
    },
  });

  useEffect(() => {
    hookRefs.current.onUpdated = onUpdated;
    hookRefs.current.onMounted = onMounted;
    hookRefs.current.onToAnchor = onToAnchor;
  }, [onUpdated, onMounted, onToAnchor]);

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
            hookRefs.current.onMounted?.(ctx);
          })
          .markdownUpdated((_, markdown) => {
            hookRefs.current.onUpdated?.(ctx, markdown);
          });

        // edit mode
        ctx.set(editorViewOptionsCtx, {
          editable: () => !readonly,
        });

        ctx.set(headingConfig.key, {
          toAnchor: (id: string) => {
            updateLocationHash(id);
            scrollToEditorAnchor(id);
            hookRefs.current.onToAnchor?.(id);
          },
        });
      });

      return crepe;
    },
    [isDarkMode, readonly, reRenderMarker],
  );

  // for update the editor using a wrapped ref
  useImperativeHandle(
    editorWrappedRef,
    () => ({
      get,
      reRender,
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
    }),
    [get, reRender],
  );

  return <Milkdown></Milkdown>;
};
