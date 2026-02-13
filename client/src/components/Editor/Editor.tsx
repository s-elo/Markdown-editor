import { Ctx } from '@milkdown/kit/ctx';
import { outline } from '@milkdown/utils';
import { ScrollPanel } from 'primereact/scrollpanel';
import React, { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { CrepeEditor, CrepeEditorRef } from './CrepeEditor';
import { getServerInstallationGuide } from './guideContent';
import { removeEvents, scrollHandler, blurHandler, anchorHandler, syncMirror } from './mountedAddons';

import { useGetDocQuery } from '@/redux-api/docs';
// import { useUploadImgMutation } from '@/redux-api/imgStoreApi';
import { updateCurDoc, selectCurDoc, selectCurTabs, updateHeadings } from '@/redux-feature/curDocSlice';
import {
  selectAppVersion,
  selectNarrowMode,
  selectReadonly,
  selectTheme,
  ServerStatus,
  updateGlobalOpts,
} from '@/redux-feature/globalOptsSlice';
import { normalizePath } from '@/utils/utils';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './Editor.scss';

function getDefaultValue(serverStatus: ServerStatus, appVersion: string, globalContent: string) {
  if (serverStatus === ServerStatus.CANNOT_CONNECT) {
    return getServerInstallationGuide(appVersion);
  }

  return globalContent;
}

export interface MarkdownEditorRef {
  update: (markdown: string) => void;
}

export const MarkdownEditor: React.FC<{ ref: React.RefObject<MarkdownEditorRef>; serverStatus: ServerStatus }> = ({
  ref: editorWrappedRef,
  serverStatus,
}) => {
  const { docPath = '' } = useParams<{
    docPath: string;
  }>();
  const curDocPath = normalizePath([docPath]);

  const { content: globalContent, contentPath: globalPath, scrollTop } = useSelector(selectCurDoc);
  const theme = useSelector(selectTheme);
  const readonly = useSelector(selectReadonly);
  const narrowMode = useSelector(selectNarrowMode);

  const appVersion = useSelector(selectAppVersion);

  const dispatch = useDispatch();

  const crepeEditorRef = useRef<CrepeEditorRef>(null);

  // const uploadImgMutation = useUploadImgMutation();

  // useGetDocQuery will be cached (within a limited time) according to different contentPath
  const {
    data = {
      content: 'Loading...',
      filePath: '',
      headings: [],
      keywords: [],
    },
    isSuccess,
  } = useGetDocQuery(curDocPath);

  /**
   * below is to avoid remount when saving a edited article (avoid losing focus)
   */
  const dataContentRef = useRef<string>(data?.content ?? ''); // avoid closure issue when markdownUpdated
  const pathEqualRef = useRef(false);
  const pathChangeRef = useRef(false); // used to trigger the editor to remount
  // remount editor when from in-equal to equal
  // it means the global doc has been sync after switching article
  // and we can get the actual content
  if (!pathEqualRef.current && curDocPath === globalPath) {
    pathChangeRef.current = !pathChangeRef.current;
    pathEqualRef.current = true;
  }

  // switching articles
  useEffect(() => {
    // reset the pathEqualRef to be false
    pathEqualRef.current = false;
  }, [curDocPath]);

  // for update the editor using a wrapped ref
  React.useImperativeHandle(editorWrappedRef, () => ({
    update: (markdown: string) => {
      crepeEditorRef.current?.update(markdown);
    },
  }));

  const curTabs = useSelector(selectCurTabs);

  /**
   * only run when the fetch data changed
   * 1. switch to another article
   * 2. loading to success, including current doc is saved
   */
  useEffect(() => {
    if (isSuccess) {
      dataContentRef.current = data?.content ?? '';

      const tab = curTabs.find(({ path }) => path === curDocPath);

      const ctx = crepeEditorRef.current?.get()?.ctx;
      // update the global current doc
      dispatch(
        updateCurDoc({
          content: data?.content ?? '',
          // if switch, then false
          // if same path, then compare data.content === globalContent
          isDirty: pathEqualRef.current ? data?.content !== globalContent : false,
          contentPath: curDocPath,
          headings: ctx ? outline()(ctx) : [],
          scrollTop: pathEqualRef.current ? scrollTop : tab ? tab.scroll : 0,
          // the scroll top is initially set as 0 when switching (path is inequal)
          // unless it is been visited and has scroll record at the tabs
        }),
      );
    }
    // when editing a doc and actually save the doc(data.content changed),
    // we need to update the dataContentRef.current
  }, [data?.content]);

  // theme, readonly, pathChangeRef.current, serverStatus

  const onMounted = (ctx: Ctx) => {
    dispatch(updateHeadings(outline()(ctx)));

    removeEvents();

    scrollHandler(scrollTop, dispatch);

    blurHandler(dispatch);

    // has higher priority than the scrollHandler
    anchorHandler(dispatch);

    syncMirror(readonly);
  };

  const onUpdated = (ctx: Ctx, markdown: string) => {
    // data.content is the original cached content
    // markdown is the updated content
    let isDirty = false;

    // being edited
    if (markdown !== dataContentRef.current) {
      isDirty = true;
    }

    // update the global current doc
    dispatch(
      updateCurDoc({
        content: markdown,
        isDirty,
        contentPath: curDocPath,
        headings: outline()(ctx),
      }),
    );
  };

  const onToAnchor = (id: string) => {
    dispatch(updateGlobalOpts({ keys: ['anchor'], values: [id] }));
  };

  const resetMark = useMemo(() => {
    return {
      path: pathChangeRef.current,
      serverStatus,
    };
  }, [pathChangeRef.current, serverStatus]);

  return (
    <div className={`editor-box ${narrowMode ? 'narrow' : ''}`}>
      <ScrollPanel>
        <CrepeEditor
          ref={crepeEditorRef}
          defaultValue={getDefaultValue(serverStatus, appVersion, globalContent)}
          resetMark={resetMark}
          isDarkMode={theme === 'dark'}
          readonly={readonly}
          onMounted={onMounted}
          onUpdated={onUpdated}
          onToAnchor={onToAnchor}
        />
      </ScrollPanel>
    </div>
  );
};
