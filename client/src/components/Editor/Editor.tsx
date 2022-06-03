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
import { nordLight, nord } from "@milkdown/theme-nord";
import { ReactEditor, useEditor, EditorRef } from "@milkdown/react";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { history } from "@milkdown/plugin-history";
import { emoji } from "@milkdown/plugin-emoji";
import { indent } from "@milkdown/plugin-indent";
import { prism } from "@milkdown/plugin-prism";
import upload from "./uploadConfig";

import { useDispatch, useSelector } from "react-redux";
import { updateCurDoc, selectCurDoc } from "@/redux-feature/curDocSlice";
import { selectDocGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocQuery } from "@/redux-api/docsApi";
import { useUploadImgMutation } from "@/redux-api/imgStoreApi";

import { localStore } from "@/utils/utils";

import {
  scrollHandler,
  blurHandler,
  anchorHandler,
  addHeadingAnchor,
  keywordsHandler,
} from "./mountedAddons";

import slash from "./slashCofig";
import tooltip from "./tooltipConfig";
import menu from "./menuConfig";

import { EditorWrappedRef } from "../EditorContainer/EditorContainer";

import "./Editor.less";

const getNord = (isDarkMode: boolean) => {
  return isDarkMode ? nord : nordLight;
};

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
              // below will be executed after useEffect (after updating the globalContent)
              // since after updating the global content, below will not be reexecuted again
              // the curPath and globalContent will be the previous closure...
              /**
               * 1. handle scrolling - record the scrolling status
               */
              // switch article
              if (curPath !== globalPath) {
                scrollHandler(0, dispatch);
              } else {
                // switch modes
                scrollHandler(scrollTop, dispatch);
              }

              /**
               * 2. handle blur based on if the mouse is on the milkdown or not
               */
              blurHandler(dispatch);

              /**
               * 3. handle heading anchor (add the outline aside headings)
               */
              readonly && addHeadingAnchor(curPath.split("-"), isDarkMode);

              /**
               * 4. handle keyword anchors (add id to the strong elements)
               */
              keywordsHandler(data.keywords);

              /**
               * 5. handle anchor
               */
              anchorHandler(anchor, dispatch);
            })
            .markdownUpdated((ctx, markdown, prevMarkdown) => {
              // const view = ctx.get(editorViewCtx);

              // const state = view.state;

              // console.log(state.tr.selection.from);
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

          // curId === contentId: dark mode switch or readonly mode switch
          // curId !== contentId: article switch
          // below will be executed before useEffect (before updating the globalContent)
          // since after updating the global content, below will not be reexecuted again
          // the curPath and globalContent will be the previous closure...
          const defaultValue =
            curPath !== globalPath ? dataContentRef.current : globalContent;

          ctx.set(
            defaultValueCtx,

            // dark mode changed, remain the same editing content
            defaultValue
          );
        })
        .use(getNord(isDarkMode))
        .use(gfm)
        .use(listener)
        .use(tooltip)
        .use(slash)
        .use(menu)
        .use(history)
        .use(emoji)
        .use(indent)
        .use(upload(uploadImgMutation))
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
          scrollTop: 0,
          // the scroll top is initially set as 0
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
