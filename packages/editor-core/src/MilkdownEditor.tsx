import { Editor, editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/kit/core';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import { Slice } from '@milkdown/kit/prose/model';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { outline } from '@milkdown/utils';
import { forwardRef, useEffect, useImperativeHandle, useReducer, useRef } from 'react';

import { getCrepe, type CrepeOptions } from './crepe';
import { mountEditorAddons, removeEvents } from './mountedAddons';
import { headingConfig } from './plugins/plugin-heading';

import type { Ctx } from '@milkdown/kit/ctx';

export interface EditorHeading {
  text: string;
  level: number;
  id: string;
}

export interface CrepeEditorRef {
  update: (newContent: string) => void;
  get: () => Editor | undefined;
  reRender: () => void;
}

export interface CrepeEditorProps extends Pick<CrepeOptions, 'getImageUrl' | 'onToast' | 'uploadImage'> {
  defaultValue?: string;
  isDarkMode?: boolean;
  readonly?: boolean;
  initialScrollTop?: number;
  getScrollContainer?: () => HTMLElement | null;
  getMirrorContainer?: () => HTMLElement | null;
  onMounted?: (ctx: Ctx) => void;
  onUpdated?: (ctx: Ctx, markdown: string) => void;
  onToAnchor?: (id: string) => void;
  onHeadingsChange?: (headings: EditorHeading[]) => void;
  onScroll?: (scrollTop: number) => void;
  onAnchorChange?: (anchor: string) => void;
  onBlurChange?: (isBlurred: boolean) => void;
}

const CrepeEditorContent = forwardRef<CrepeEditorRef, CrepeEditorProps>(
  (
    {
      defaultValue = '',
      isDarkMode = false,
      readonly = false,
      initialScrollTop = 0,
      getScrollContainer,
      getMirrorContainer,
      onMounted,
      onUpdated,
      onToAnchor,
      onHeadingsChange,
      onScroll,
      onAnchorChange,
      onBlurChange,
      onToast,
      uploadImage,
      getImageUrl,
    },
    editorWrappedRef,
  ) => {
    const [reRenderMarker, reRender] = useReducer((value) => value + 1, 0);
    const callbacks = useRef({ onMounted, onUpdated, onToAnchor, onHeadingsChange });
    useEffect(() => {
      callbacks.current = { onMounted, onUpdated, onToAnchor, onHeadingsChange };
    }, [onMounted, onUpdated, onToAnchor, onHeadingsChange]);

    const { get } = useEditor(
      (root) => {
        const crepe = getCrepe({ root, defaultValue, isDarkMode, onToast, uploadImage, getImageUrl });
        crepe.editor.config((ctx) => {
          ctx
            .get(listenerCtx)
            .mounted(() => {
              const headings = outline()(ctx);
              callbacks.current.onHeadingsChange?.(headings);
              mountEditorAddons({
                readonly,
                initialScrollTop,
                getScrollContainer,
                getMirrorContainer,
                onScroll,
                onAnchorChange,
                onBlurChange,
              });
              callbacks.current.onMounted?.(ctx);
            })
            .markdownUpdated((_, markdown) => {
              const headings = outline()(ctx);
              callbacks.current.onHeadingsChange?.(headings);
              callbacks.current.onUpdated?.(ctx, markdown);
            });
          ctx.set(editorViewOptionsCtx, { editable: () => !readonly });
          ctx.set(headingConfig.key, {
            toAnchor: (id: string) => {
              window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
              getScrollContainer?.()?.scrollTo({ top: document.getElementById(id)?.offsetTop ?? 0, behavior: 'auto' });
              callbacks.current.onToAnchor?.(id);
            },
          });
        });
        return crepe;
      },
      [isDarkMode, readonly, reRenderMarker],
    );

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
            const doc = ctx.get(parserCtx)(markdown);
            if (!doc) return;
            view.dispatch(view.state.tr.replace(0, view.state.doc.content.size, new Slice(doc.content, 0, 0)));
          });
        },
      }),
      [get, reRender],
    );

    useEffect(
      () => () => {
        removeEvents();
      },
      [],
    );
    return <Milkdown />;
  },
);

CrepeEditorContent.displayName = 'CrepeEditorContent';

/** Complete editor component, including the Milkdown React provider. */
export const CrepeEditor = forwardRef<CrepeEditorRef, CrepeEditorProps>((props, ref) => (
  <MilkdownProvider>
    <CrepeEditorContent {...props} ref={ref} />
  </MilkdownProvider>
));

CrepeEditor.displayName = 'CrepeEditor';
