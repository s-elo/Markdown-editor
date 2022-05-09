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
import { Slice } from "@milkdown/prose";
import { nordLight, nord } from "@milkdown/theme-nord";
import { ReactEditor, useEditor, EditorRef } from "@milkdown/react";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { history } from "@milkdown/plugin-history";
import { emoji } from "@milkdown/plugin-emoji";
import { indent } from "@milkdown/plugin-indent";
import { prism } from "@milkdown/plugin-prism";

import { useDispatch, useSelector } from "react-redux";
import { updateCurDoc, selectCurDoc } from "@/redux-feature/curDocSlice";
import { selectDocGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocQuery } from "@/redux-api/docsApi";

import { localStore } from "@/utils/utils";

import {
  scrollHandler,
  blurHandler,
  anchorHandler,
  addHeadingAnchor,
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
    },
    isSuccess,
  } = useGetDocQuery(curPath);

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
               * 3. handle anchor
               */
              anchorHandler(anchor, dispatch);

              /**
               * 4. handle heading anchor
               */
              readonly && addHeadingAnchor(curPath.split("-"), isDarkMode);
            })
            .markdownUpdated((ctx, markdown, prevMarkdown) => {
              // data.content is the original cached content
              // markdown is the updated content
              let isDirty = false;

              // being edited
              if (markdown !== data.content) {
                isDirty = true;
              }

              // update the global current doc
              dispatch(
                updateCurDoc({
                  content: markdown,
                  isDirty,
                  contentPath: curPath,
                  scrollTop,
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
            curPath !== globalPath ? data.content : globalContent;

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
        .use(prism),
    [isDarkMode, readonly, data.content]
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
      // update the global current doc
      dispatch(
        updateCurDoc({
          content: data.content,
          isDirty: false,
          contentPath: curPath,
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
