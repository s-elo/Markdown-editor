import { Ctx } from '@milkdown/kit/ctx';
import { outline } from '@milkdown/utils';
import { ScrollPanel } from 'primereact/scrollpanel';
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { CrepeEditor, CrepeEditorRef } from './CrepeEditor';
import { getServerInstallationGuide } from './guideContent';
import { removeEvents, scrollHandler, blurHandler, anchorHandler, syncMirror } from './mountedAddons';

import { useGetDocQuery } from '@/redux-api/docs';
import { updateCurDoc, selectCurDoc, selectCurTabs, updateHeadings } from '@/redux-feature/curDocSlice';
import {
  selectAppVersion,
  selectNarrowMode,
  selectReadonly,
  selectTheme,
  ServerStatus,
  updateGlobalOpts,
} from '@/redux-feature/globalOptsSlice';
import Toast from '@/utils/Toast';
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

const getDefaultDoc = () => ({
  content: 'Loading...',
  filePath: '',
  headings: [],
  keywords: [],
});

export const MarkdownEditor: React.FC<{ ref: React.RefObject<MarkdownEditorRef>; serverStatus: ServerStatus }> = ({
  ref: editorWrappedRef,
  serverStatus,
}) => {
  const { docPath = '' } = useParams<{
    docPath: string;
  }>();
  const curDocPath = normalizePath([docPath]);

  // useGetDocQuery will be cached (within a limited time) according to different contentPath
  // with auto refetch when the doc is updated
  const { data: fetchedDoc = getDefaultDoc(), isSuccess, error } = useGetDocQuery(curDocPath);

  const { content: storedContent, scrollTop, contentPath: storedContentPath } = useSelector(selectCurDoc);
  const theme = useSelector(selectTheme);
  const readonly = useSelector(selectReadonly);
  const narrowMode = useSelector(selectNarrowMode);
  const appVersion = useSelector(selectAppVersion);

  const dispatch = useDispatch();

  const crepeEditorRef = useRef<CrepeEditorRef>(null);

  // for update the editor using a wrapped ref
  React.useImperativeHandle(editorWrappedRef, () => ({
    update: (markdown: string) => {
      crepeEditorRef.current?.update(markdown);
    },
  }));

  const curTabs = useSelector(selectCurTabs);

  // when switching the doc
  useEffect(() => {
    if (!isSuccess && error) {
      return Toast.error((error as unknown as Error).message ?? 'Failed to fetch doc');
    }

    // same doc, no need to update, meaning updateDoc query triggers the doc query
    if (fetchedDoc?.filePath === storedContentPath) return;

    const tab = curTabs.find(({ path }) => path === curDocPath);
    const ctx = crepeEditorRef.current?.get()?.ctx;
    // update the global current doc
    dispatch(
      updateCurDoc({
        content: fetchedDoc?.content,
        // if switch, then false
        isDirty: false,
        contentPath: fetchedDoc?.filePath,
        headings: ctx ? outline()(ctx) : [],
        // the scroll top is initially set as 0 when switching (path is inequal)
        // unless it is been visited and has scroll record at the tabs
        scrollTop: tab ? tab.scroll : 0,
      }),
    );

    crepeEditorRef.current?.reRender();
  }, [fetchedDoc?.content]);

  useEffect(() => {
    crepeEditorRef.current?.reRender();
  }, [serverStatus]);

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
    if (markdown !== fetchedDoc?.content) {
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

  return (
    <div className={`editor-box ${narrowMode ? 'narrow' : ''}`}>
      <ScrollPanel>
        <CrepeEditor
          ref={crepeEditorRef}
          defaultValue={getDefaultValue(serverStatus, appVersion, storedContent)}
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
