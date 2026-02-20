import { Ctx } from '@milkdown/kit/ctx';
import { outline } from '@milkdown/utils';
import { ScrollPanel } from 'primereact/scrollpanel';
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { CrepeEditor, CrepeEditorRef } from './MilkdownEditor';
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
  }, [fetchedDoc?.content]);

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
        />
      </ScrollPanel>
    </div>
  );
};
