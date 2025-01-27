/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Editor, rootCtx, editorViewOptionsCtx, defaultValueCtx, editorViewCtx, parserCtx } from '@milkdown/core';
// import { getNord } from "@milkdown/theme-nord";
import { diagram } from '@milkdown/plugin-diagram';
import { emoji } from '@milkdown/plugin-emoji';
import { history } from '@milkdown/plugin-history';
import { indent } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { Slice } from '@milkdown/prose/model';
import { ReactEditor, useEditor, EditorRef } from '@milkdown/react';
import { getTokyo } from '@milkdown/theme-tokyo';
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import gfm from './configs/gfmConfig';
import menu from './configs/menuConfig';
import prism from './configs/prismConfig';
import slash from './configs/slashConfig';
import tooltip from './configs/tooltipConfig';
import upload from './configs/uploadConfig';
import { removeEvents, scrollHandler, blurHandler, addClipboard, anchorHandler, syncMirror } from './mountedAddons';
import iframe from './plugins/iframe-plugin/iframe';
import { EditorWrappedRef } from '../EditorContainer/EditorContainer';

import { useGetDocQuery } from '@/redux-api/docsApi';
import { useUploadImgMutation } from '@/redux-api/imgStoreApi';
import { updateCurDoc, selectCurDoc, selectCurTabs } from '@/redux-feature/curDocSlice';
import { selectDocGlobalOpts } from '@/redux-feature/globalOptsSlice';
import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';

import './Editor.less';

export default React.forwardRef<EditorWrappedRef>((_, editorWrappedRef) => {
  const { contentPath: curPath } = useParams<{
    contentPath: string;
  }>();

  const { content: globalContent, contentPath: globalPath, scrollTop } = useSelector(selectCurDoc);
  const { isDarkMode, readonly, anchor } = useSelector(selectDocGlobalOpts);

  const dispatch = useDispatch();

  const scrollToAnchor = useEditorScrollToAnchor();

  const uploadImgMutation = useUploadImgMutation();

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
  const dataContentRef = useRef<string>(data.content); // avoid closure issue when markdownUpdated
  const pathEqualRef = useRef(false);
  const pathChangeRef = useRef(false); // used to trigger the editor to remount
  // remount editor when from in-equal to equal
  // it means the global doc has been sync after switching article
  // and we can get the actual content
  if (!pathEqualRef.current && curPath === globalPath) {
    pathChangeRef.current = !pathChangeRef.current;
    pathEqualRef.current = true;
  }
  // when switching articles, reset the pathEqualRef to be false
  useEffect(() => {
    pathEqualRef.current = false;
  }, [curPath]);

  const editor = useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          // when updated, get the string value of the markdown
          ctx
            .get(listenerCtx)
            .mounted(() => {
              removeEvents();

              scrollHandler(scrollTop, dispatch);

              blurHandler(dispatch);

              addClipboard(readonly);

              anchorHandler(anchor, dispatch, scrollToAnchor);

              syncMirror(readonly);
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
            .markdownUpdated((updateCtx, markdown, prevMarkdown) => {
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
                }),
              );
            });

          // edit mode
          ctx.set(editorViewOptionsCtx, {
            editable: () => !readonly,
          });

          // global content and global path have been sync
          ctx.set(defaultValueCtx, globalContent);
        })
        // .use(getNord(isDarkMode))
        .use(getTokyo(isDarkMode))
        .use(gfm)
        .use(listener)
        .use(tooltip)
        .use(slash)
        .use(menu)
        .use(history)
        .use(emoji)
        .use(indent)
        .use(upload(uploadImgMutation, curPath))
        .use(iframe)
        .use(prism)
        .use(diagram),
    [isDarkMode, readonly, pathChangeRef.current],
  );

  // for update the editor using a wrapped ref
  const editorRef = useRef<EditorRef>(null);
  React.useImperativeHandle(editorWrappedRef, () => ({
    update: (markdown: string) => {
      if (!editorRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const editor = editorRef.current.get();
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
      dataContentRef.current = data.content;

      const tab = curTabs.find(({ path }) => path === curPath);

      // update the global current doc
      dispatch(
        updateCurDoc({
          content: data.content,
          // if switch, then false
          // if same path, then compare data.content === globalContent
          isDirty: pathEqualRef.current ? data.content !== globalContent : false,
          contentPath: curPath,
          scrollTop: pathEqualRef.current ? scrollTop : tab ? tab.scroll : 0,
          // the scroll top is initially set as 0 when switching (path is inequal)
          // unless it is been visited and has scroll record at the tabs
        }),
      );
    }
    // eslint-disable-next-line
  }, [data.content]);

  return (
    <div className="editor-box">
      <ReactEditor editor={editor} ref={editorRef}></ReactEditor>
    </div>
  );
});
