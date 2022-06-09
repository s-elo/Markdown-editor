import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Editor,
  rootCtx,
  editorViewOptionsCtx,
  defaultValueCtx,
  editorViewCtx,
  parserCtx,
} from "@milkdown/core";
import { Slice } from "@milkdown/prose/model";
// import { getNord } from "@milkdown/theme-nord";
import { getTokyo } from "@milkdown/theme-tokyo";
import { ReactEditor, useEditor, EditorRef } from "@milkdown/react";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { history } from "@milkdown/plugin-history";
import { emoji } from "@milkdown/plugin-emoji";
import { indent } from "@milkdown/plugin-indent";

import { useDispatch, useSelector } from "react-redux";
import { updateCurDoc, selectCurDoc } from "@/redux-feature/curDocSlice";
import { selectDocGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocQuery } from "@/redux-api/docsApi";
import { useUploadImgMutation } from "@/redux-api/imgStoreApi";

import { localStore } from "@/utils/utils";

import addons from "./mountedAddons";

import slash from "./configs/slashCofig";
import tooltip from "./configs/tooltipConfig";
import menu from "./configs/menuConfig";
import prism from "./configs/prismConfig";
import upload from "./configs/uploadConfig";

import { EditorWrappedRef } from "../EditorContainer/EditorContainer";

import "./Editor.less";

export default React.forwardRef<EditorWrappedRef>((_, editorWrappedRef) => {
  const { contentPath: curPath } = useParams<{
    contentPath: string;
  }>();

  const {
    content: globalContent,
    contentPath: globalPath,
    scrollTop,
  } = useSelector(selectCurDoc);
  const { isDarkMode, readonly, anchor } = useSelector(selectDocGlobalOpts);

  const dispatch = useDispatch();

  const { value: recentPath, setStore: storeRecentPath } =
    localStore("recentPath");

  if (recentPath !== curPath) storeRecentPath(`/article/${curPath}`);

  // useGetDocQuery will be cached (within a limited time) according to different contentPath
  const {
    data = {
      content: "Loading...",
      filePath: "",
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
  const pathChangeRef = useRef(false); // used to triger the editor to remount
  // remount editor when from inequal to equal
  // it means the global doc has been sync after swiching article
  // and we can get the actual content
  if (pathEqualRef.current === false && curPath === globalPath) {
    pathChangeRef.current = !pathChangeRef.current;
    pathEqualRef.current = true;
  }
  // when swiching articles, reset the pathEqualRef to be false
  useEffect(() => {
    pathEqualRef.current = false;
  }, [curPath]);

  const uploadImgMutation = useUploadImgMutation();

  const editor = useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          // when updated, get the string value of the markdown
          ctx
            .get(listenerCtx)
            .mounted(() => {
              const {
                removeEvents,
                scrollHandler,
                blurHandler,
                // addHeadingAnchor,
                addClipboard,
                keywordsHandler,
                anchorHandler,
              } = addons;

              /**
               * remove the binded events of previous mounting
               */
              removeEvents();

              /**
               * handle scrolling - record the scrolling status
               */
              // switch article
              // global doc info have been sync
              scrollHandler(scrollTop, dispatch);

              /**
               * handle blur based on if the mouse is on the milkdown or not
               */
              blurHandler(dispatch);

              /**
               * handle heading anchor (add the outline aside headings)
               */
              // readonly && addHeadingAnchor(curPath.split("-"));

              /**
               * add a copy btn at each code fence
               */
              readonly && addClipboard();

              /**
               * handle keyword anchors (add id to the strong elements)
               */
              keywordsHandler(data.keywords);

              /**
               * handle anchor
               */
              anchorHandler(anchor, dispatch);
            })
            .markdownUpdated((ctx, markdown, prevMarkdown) => {
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
                })
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
        .use(prism),
    [isDarkMode, readonly, pathChangeRef.current]
  );

  // for update the editor using a wrapped ref
  const editorRef = useRef<EditorRef>(null);
  React.useImperativeHandle(editorWrappedRef, () => ({
    update: (markdown: string) => {
      if (!editorRef.current) return;
      const editor = editorRef.current.get();
      if (!editor) return;

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const parser = ctx.get(parserCtx);
        const doc = parser(markdown);
        if (!doc) return;

        const state = view.state;
        view.dispatch(
          state.tr.replace(
            0,
            state.doc.content.size,
            new Slice(doc.content, 0, 0)
          )
        );
      });
    },
  }));

  /**
   * onle run when the fetch data changed
   * 1. switch to another article
   * 2. loading to success
   */
  useEffect(() => {
    if (isSuccess) {
      dataContentRef.current = data.content;

      // update the global current doc
      dispatch(
        updateCurDoc({
          content: data.content,
          isDirty: false,
          contentPath: curPath,
          scrollTop: pathEqualRef.current ? scrollTop : 0,
          // the scroll top is initially set as 0 when switching (path is inequal)
        })
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
