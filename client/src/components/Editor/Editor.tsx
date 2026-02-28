import { editorViewCtx } from '@milkdown/kit/core';
import { Ctx } from '@milkdown/kit/ctx';
import { outline } from '@milkdown/utils';
import { ScrollPanel } from 'primereact/scrollpanel';
import React, { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

import { CrepeEditor, CrepeEditorRef } from './MilkdownEditor';
import { searchAndHighlight } from './mountedAddons';
import { EditorRef } from './type';

import { useGetDocQuery } from '@/redux-api/docs';
import { useGetSettingsQuery } from '@/redux-api/settings';
import { updateCurDoc, selectCurDoc, selectCurTabs, clearCurDoc } from '@/redux-feature/curDocSlice';
import { clearDraft, selectDraft, setDraft } from '@/redux-feature/draftsSlice';
import { selectNarrowMode, selectReadonly, selectTheme } from '@/redux-feature/globalOptsSlice';
import Toast from '@/utils/Toast';
import { getDraftKey, normalizePath } from '@/utils/utils';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './Editor.scss';

const SEARCH_HIGHLIGHT_DELAY_SAME_DOC = 50;
const SEARCH_HIGHLIGHT_DELAY_NEW_DOC = 200;

const getDefaultDoc = () => ({
  content: 'Loading...',
  filePath: '',
  headings: [],
  keywords: [],
});

export const MarkdownEditor: React.FC<{ ref: React.RefObject<EditorRef | null> }> = ({ ref: editorWrappedRef }) => {
  const { docPath = '' } = useParams<{
    docPath: string;
  }>();
  const curDocPath = normalizePath([docPath]);

  const navigate = useNavigate();
  const location = useLocation();

  // useGetDocQuery will be cached (within a limited time) according to different contentPath
  // with auto refetch when the doc is updated
  const { data: fetchedDoc = getDefaultDoc(), isSuccess, error } = useGetDocQuery(curDocPath);
  const { data: settings } = useGetSettingsQuery();

  const { content: storedContent, contentIdent: storedContentPath } = useSelector(selectCurDoc);
  const draftKey = getDraftKey(settings?.docRootPath, curDocPath);
  const draft = useSelector(selectDraft(draftKey));
  const theme = useSelector(selectTheme);
  const readonly = useSelector(selectReadonly);
  const narrowMode = useSelector(selectNarrowMode);

  const dispatch = useDispatch();

  const crepeEditorRef = useRef<CrepeEditorRef>(null);

  // for update the editor using a wrapped ref
  React.useImperativeHandle(editorWrappedRef, () => ({
    update: (markdown: string) => {
      crepeEditorRef.current?.update(markdown);
    },
  }));

  const curTabs = useSelector(selectCurTabs);

  const pendingSearchRef = useRef<{ query: string; lineContent: string } | null>(null);

  // Capture search highlight state from navigation and clear it from the URL
  useEffect(() => {
    const state = location.state as { searchQuery?: string; lineContent?: string } | null;
    if (!state?.searchQuery) return;

    pendingSearchRef.current = { query: state.searchQuery, lineContent: state.lineContent ?? '' };
    void navigate(location.pathname, { replace: true, state: null });

    // If the editor already has the correct doc loaded (same-doc navigation), apply immediately
    if (storedContentPath === curDocPath) {
      const editor = crepeEditorRef.current?.get();
      if (!editor) return;

      const pending = pendingSearchRef.current;
      setTimeout(() => {
        try {
          editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            const found = searchAndHighlight(view, pending.query, pending.lineContent);
            if (found) {
              pendingSearchRef.current = null;
            }
          });
        } catch {
          /* editor might have been destroyed */
        }
      }, SEARCH_HIGHLIGHT_DELAY_SAME_DOC);
    }
  }, [location.key]); // only trigger on navigation events

  // When the editor mounts (new doc), apply any pending search highlight
  const onMounted = useCallback((ctx: Ctx) => {
    const pending = pendingSearchRef.current;
    if (!pending) return;

    setTimeout(() => {
      try {
        const view = ctx.get(editorViewCtx);
        const found = searchAndHighlight(view, pending.query, pending.lineContent);
        if (found) {
          pendingSearchRef.current = null;
        }
      } catch {
        /* editor might have been destroyed during re-render */
      }
    }, SEARCH_HIGHLIGHT_DELAY_NEW_DOC);
  }, []);

  useEffect(() => {
    return () => {
      dispatch(clearCurDoc());
    };
  }, []);

  useEffect(() => {
    if (error) {
      void navigate('/');
      return Toast.error((error as unknown as Error).message ?? 'Failed to fetch doc');
    }
  }, [error]);

  // when switching the doc (or same doc refetched)
  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    if (fetchedDoc?.filePath === storedContentPath) return;

    const tab = curTabs.find(({ ident }) => ident === curDocPath);
    const ctx = crepeEditorRef.current?.get()?.ctx;
    const contentToUse = draft?.content ?? fetchedDoc?.content;
    const headingsToUse = draft?.headings ?? (ctx ? outline()(ctx) : []);

    dispatch(
      updateCurDoc({
        content: contentToUse,
        isDirty: Boolean(draft),
        contentIdent: fetchedDoc?.filePath,
        headings: headingsToUse,
        scrollTop: tab ? tab.scroll : 0,
        type: 'workspace',
      }),
    );

    crepeEditorRef.current?.reRender();
  }, [fetchedDoc]);

  const onUpdated = (ctx: Ctx, markdown: string) => {
    const isDirty = markdown !== fetchedDoc?.content;

    const headings = outline()(ctx);

    dispatch(
      updateCurDoc({
        content: markdown,
        isDirty,
        contentIdent: curDocPath,
        headings,
        type: 'workspace',
      }),
    );

    if (isDirty) {
      dispatch(setDraft({ path: draftKey, content: markdown, headings }));
    } else {
      dispatch(clearDraft(draftKey));
    }
  };

  return (
    <div className={`editor-box ${narrowMode ? 'narrow' : ''}`}>
      <ScrollPanel>
        <CrepeEditor
          ref={crepeEditorRef}
          defaultValue={storedContent}
          isDarkMode={theme === 'dark'}
          readonly={readonly}
          onUpdated={onUpdated}
          onMounted={onMounted}
        />
      </ScrollPanel>
    </div>
  );
};
