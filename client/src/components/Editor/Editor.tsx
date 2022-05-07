import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useParams, BrowserRouter } from "react-router-dom";
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

import { useDispatch, useSelector, Provider } from "react-redux";
import {
  updateCurDoc,
  selectCurDoc,
  updateScrolling,
} from "@/redux-feature/curDocSlice";
import {
  selectGlobalOpts,
  updateGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import { useGetDocQuery } from "@/redux-api/docsApi";
import store from "@/store";

import Outline from "../Menu/Outline";

import { localStore } from "@/utils/utils";

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
  const { isDarkMode, readonly, anchor } = useSelector(selectGlobalOpts);

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
              // record the scrolling status
              const milkdownDom =
                document.getElementsByClassName("milkdown")[0];

              // get the previous scroll top
              milkdownDom.scrollTop = scrollTop;

              milkdownDom.addEventListener("scroll", () => {
                // console.log(milkdownDom.scrollTop);
                dispatch(updateScrolling({ scrollTop: milkdownDom.scrollTop }));
              });

              // go to the anchor
              const dom = document.getElementById(anchor);
              dom && dom.scrollIntoView({ behavior: "smooth" });

              // clear the anchor to avoid reanchor when switch modes
              // the actual scrolling will be recorded in curglobal doc info above
              dispatch(updateGlobalOpts({ keys: ["anchor"], values: [""] }));

              if (readonly) {
                // add outline on each heading
                const headingDoms = document.getElementsByClassName("heading");
                if (!headingDoms) return;

                for (const headingDom of headingDoms) {
                  const div = document.createElement("div");
                  div.classList.add("heading-outline");

                  headingDom.appendChild(div);

                  ReactDOM.render(
                    <Provider store={store}>
                      <BrowserRouter>
                        <Outline
                          containerDom={
                            document.getElementsByClassName(
                              "milkdown"
                            )[0] as HTMLElement
                          }
                          path={curPath.split("-")}
                          iconColor={isDarkMode ? "white" : "black"}
                        />
                      </BrowserRouter>
                    </Provider>,
                    div
                  );
                }
              }
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
            })
            .focus(() => {
              // when focus editor
              // update the editor state
              dispatch(
                updateGlobalOpts({ keys: ["isEditorBlur"], values: [false] })
              );
            })
            .blur(() => {
              // when editor loses focus
              dispatch(
                updateGlobalOpts({ keys: ["isEditorBlur"], values: [true] })
              );
            });

          // edit mode
          ctx.set(editorViewOptionsCtx, {
            editable: () => !readonly,
          });

          // curId === contentId: dark mode switch or readonly mode switch
          // curId !== contentId: article switch
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
