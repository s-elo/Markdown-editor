import { editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/kit/core';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import { Slice } from '@milkdown/kit/prose/model';
import { Milkdown, useEditor } from '@milkdown/react';
import { outline } from '@milkdown/utils';
import { ScrollPanel } from 'primereact/scrollpanel';
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getCrepe } from './crepe';
import { removeEvents, scrollHandler, blurHandler, anchorHandler, syncMirror } from './mountedAddons';
import { EditorWrappedRef } from '../EditorContainer/EditorContainer';

import { useGetDocQuery } from '@/redux-api/docs';
// import { useUploadImgMutation } from '@/redux-api/imgStoreApi';
import { updateCurDoc, selectCurDoc, selectCurTabs, updateHeadings } from '@/redux-feature/curDocSlice';
import { selectDocGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { normalizePath } from '@/utils/utils';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import './Editor.scss';

export const MarkdownEditor: React.FC<{ ref: React.RefObject<EditorWrappedRef> }> = ({ ref: editorWrappedRef }) => {
  const { contentPath = '' } = useParams<{
    contentPath: string;
  }>();
  const curPath = normalizePath([contentPath]);

  const { content: globalContent, contentPath: globalPath, scrollTop } = useSelector(selectCurDoc);
  const { isDarkMode, readonly, narrowMode } = useSelector(selectDocGlobalOpts);

  const dispatch = useDispatch();

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
  } = useGetDocQuery(curPath);

  /**
   * below is to avoid remount when saving a edited article (avoid losing focus)
   */
  const dataContentRef = useRef<string>(data?.content ?? ''); // avoid closure issue when markdownUpdated
  const pathEqualRef = useRef(false);
  const pathChangeRef = useRef(false); // used to trigger the editor to remount
  // remount editor when from in-equal to equal
  // it means the global doc has been sync after switching article
  // and we can get the actual content
  if (!pathEqualRef.current && curPath === globalPath) {
    pathChangeRef.current = !pathChangeRef.current;
    pathEqualRef.current = true;
  }

  // switching articles
  useEffect(() => {
    // reset the pathEqualRef to be false
    pathEqualRef.current = false;
  }, [curPath]);

  const { get } = useEditor(
    (root) => {
      const crepe = getCrepe({
        root,
        defaultValue: globalContent,
        isDarkMode,
      });

      crepe.editor.config((ctx) => {
        ctx
          .get(listenerCtx)
          .mounted(() => {
            dispatch(updateHeadings(outline()(ctx)));

            removeEvents();

            scrollHandler(scrollTop, dispatch);

            blurHandler(dispatch);

            // has higher priority than the scrollHandler
            anchorHandler(dispatch);

            syncMirror(readonly);
          })
          .markdownUpdated((_, markdown) => {
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
                contentPath: curPath,
                headings: outline()(ctx),
              }),
            );
          });

        // edit mode
        ctx.set(editorViewOptionsCtx, {
          editable: () => !readonly,
        });
      });

      return crepe;
    },
    [isDarkMode, narrowMode, readonly, pathChangeRef.current],
  );

  // for update the editor using a wrapped ref
  React.useImperativeHandle(editorWrappedRef, () => ({
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

  const curTabs = useSelector(selectCurTabs);

  /**
   * only run when the fetch data changed
   * 1. switch to another article
   * 2. loading to success
   */
  useEffect(() => {
    if (isSuccess) {
      dataContentRef.current = data?.content ?? '';

      const tab = curTabs.find(({ path }) => path === curPath);

      // update the global current doc
      dispatch(
        updateCurDoc({
          content: data?.content ?? '',
          // if switch, then false
          // if same path, then compare data.content === globalContent
          isDirty: pathEqualRef.current ? data?.content !== globalContent : false,
          contentPath: curPath,
          headings: [],
          scrollTop: pathEqualRef.current ? scrollTop : tab ? tab.scroll : 0,
          // the scroll top is initially set as 0 when switching (path is inequal)
          // unless it is been visited and has scroll record at the tabs
        }),
      );
    }
    // eslint-disable-next-line
  }, [data?.filePath]);

  return (
    <div className={`editor-box ${narrowMode ? 'narrow' : ''}`}>
      <ScrollPanel>
        <Milkdown></Milkdown>
      </ScrollPanel>
    </div>
  );
};
