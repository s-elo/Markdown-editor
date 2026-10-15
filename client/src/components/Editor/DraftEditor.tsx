import { CrepeEditor, outline, type CrepeEditorRef, type Ctx } from '@markdown-editor/core';
import { ScrollPanel } from 'primereact/scrollpanel';
import React, { useEffect, useId, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getImageUrl, uploadImage } from './configs/uploadConfig';
import { getGuideDoc, getLocalModeGuideDoc } from './internalDocs/guide';
import { getVersionMismatchDoc } from './internalDocs/versionMismatch';
import { EditorRef } from './type';

import { ONLINE_MODE } from '@/constants';
import {
  updateCurDoc,
  updateHeadings,
  updateScrolling,
  selectCurTabs,
  DocType,
  selectCurDoc,
  clearCurDoc,
} from '@/redux-feature/curDocSlice';
import { selectNarrowMode, selectReadonly, selectTheme, updateGlobalOpts } from '@/redux-feature/globalOptsSlice';
import Toast from '@/utils/Toast';
import { normalizeEOL } from '@/utils/utils';

import './Editor.scss';

const getDoc = (docId: string, type: DocType) => {
  if (type === 'internal') {
    if (docId === 'guide') {
      return {
        id: docId,
        title: `Guide`,
        content: ONLINE_MODE ? getGuideDoc() : getLocalModeGuideDoc(),
      };
    }
    if (docId === 'version-mismatch') {
      return {
        id: docId,
        title: `Version Mismatch`,
        content: getVersionMismatchDoc(),
      };
    }
  }

  return {
    id: docId,
    title: `Draft ${docId}`,
    content: `draft-${docId}`,
  };
};

export interface DraftEditorProps {
  type: DocType;
  ref: React.RefObject<EditorRef | null>;
}

function tabScrollTop(tabs: { ident: string; scroll: number }[], ident: string | undefined) {
  return tabs.find((tab) => tab.ident === ident)?.scroll ?? 0;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({ ref: editorWrappedRef, type }) => {
  const uniqueId = useId();

  const { docId = uniqueId } = useParams<{
    docId: string;
  }>();

  const doc = getDoc(docId, type);

  const { content: storedContent, contentIdent } = useSelector(selectCurDoc);

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
    dispatch(
      updateGlobalOpts({
        keys: ['readonly'],
        values: [true],
      }),
    );

    return () => {
      dispatch(clearCurDoc());
      // void crepeEditorRef.current?.get()?.destroy();
    };
  }, []);

  // when switching the doc (or same doc re-fetched)
  useEffect(() => {
    if (doc?.id === contentIdent) return;

    const tab = curTabs.find(({ ident }) => ident === contentIdent);
    const ctx = crepeEditorRef.current?.get()?.ctx;
    // const contentToUse = draft?.content ?? fetchedDoc?.content;
    // const headingsToUse = draft?.headings ?? (ctx ? outline()(ctx) : []);

    const contentToUse = doc?.content;
    const headingsToUse = ctx ? outline()(ctx) : [];

    dispatch(
      updateCurDoc({
        content: contentToUse,
        // isDirty: Boolean(draft),
        isDirty: false,
        contentIdent: doc?.id,
        headings: headingsToUse,
        scrollTop: tab ? tab.scroll : 0,
        title: doc?.title,
        type,
      }),
    );

    crepeEditorRef.current?.reRender();
  }, [doc?.content, type]);

  // only for draft doc, since internal doc should not be edited and saved
  const onUpdated = (ctx: Ctx, markdown: string) => {
    if (type === 'internal') return;

    const isDirty = normalizeEOL(markdown) !== normalizeEOL(doc?.content);

    const headings = outline()(ctx);

    dispatch(
      updateCurDoc({
        content: markdown,
        isDirty,
        contentIdent: docId,
        title: doc?.title,
        headings,
        syncTab: false,
        type,
      }),
    );

    // if (isDirty) {
    //   dispatch(setDraft({ path: draftKey, content: markdown, headings }));
    // } else {
    //   dispatch(clearDraft(draftKey));
    // }
  };

  return (
    <div className={`editor-box ${narrowMode ? 'narrow' : ''}`}>
      <ScrollPanel>
        <CrepeEditor
          ref={crepeEditorRef}
          defaultValue={storedContent}
          isDarkMode={theme === 'dark'}
          readonly={readonly}
          initialScrollTop={tabScrollTop(curTabs, contentIdent)}
          getScrollContainer={() => document.querySelector('.editor-box .p-scrollpanel-content')}
          onHeadingsChange={(headings) => dispatch(updateHeadings(headings))}
          onScroll={(scrollTop) => dispatch(updateScrolling({ scrollTop }))}
          onAnchorChange={(anchor) => dispatch(updateGlobalOpts({ keys: ['anchor'], values: [anchor] }))}
          onToAnchor={(anchor) => dispatch(updateGlobalOpts({ keys: ['anchor'], values: [anchor] }))}
          onBlurChange={(isBlurred) => dispatch(updateGlobalOpts({ keys: ['isEditorBlur'], values: [isBlurred] }))}
          onToast={(message) => Toast(message)}
          uploadImage={uploadImage}
          getImageUrl={getImageUrl}
          onUpdated={onUpdated}
        />
      </ScrollPanel>
    </div>
  );
};
