import React, { useRef, useContext } from "react";
import { RouteComponentProps } from "react-router-dom";
import {
  Editor,
  rootCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  defaultValueCtx,
  parserCtx,
} from "@milkdown/core";
// import { Slice } from "@milkdown/prose";
import { Slice } from "prosemirror-model";
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
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocQuery } from "@/redux-api/docsApi";

import slash from "./slashCofig";
import tooltip from "./tooltipConfig";

import "./Editor.less";

const getNord = (isDarkMode: boolean) => {
  return isDarkMode ? nord : nordLight;
};

export default function MarkdownEditor(
  props: RouteComponentProps<{ contentPath: string; contentId: string }>
) {
  const { contentPath, contentId } = props.match.params;

  const editorRef = useRef<EditorRef>(null);
  const editable = useRef(false);

  const { content: curContent, id: curId } = useSelector(selectCurDoc);
  const { isDarkMode } = useSelector(selectGlobalOpts);

  const dispatch = useDispatch();

  const updateContent = (content: string) => {
    if (!editorRef.current || !editorRef.current.get()) return;

    const editor = editorRef.current.get();

    editor!.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const parser = ctx.get(parserCtx);
      const doc = parser(content);

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
  };

  const editableTog = () => {
    editable.current = !editable.current;

    if (editorRef.current) {
      (editorRef.current.get() as Editor).action((ctx) => {
        const view = ctx.get(editorViewCtx);

        view.updateState(view.state);
      });
    }
  };

  // useGetDocQuery will be cached (within a limited time) according to different contentPath
  const { data = { content: "" }, isSuccess } = useGetDocQuery(contentPath);

  // when curId === contentId, it means the dark mode changed
  // remain the current doc
  if (isSuccess && data && curId !== contentId) {
    updateContent(data.content);
  }

  const editor = useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          // when updated, get the string value of the markdown
          ctx
            .get(listenerCtx)
            .markdownUpdated((ctx, markdown, prevMarkdown) => {
              // update the global current doc
              dispatch(updateCurDoc({ content: markdown, id: contentId }));
            });

          // edit mode
          ctx.set(editorViewOptionsCtx, { editable: () => editable.current });

          // curId === contentId: dark mode switch
          // curId !== contentId: article switch
          const defaultValue = curId !== contentId ? data.content : curContent;
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
        .use(history)
        .use(emoji)
        .use(indent)
        .use(prism),
    [isDarkMode]
  );

  return (
    <div className="editor-box">
      <ReactEditor editor={editor} ref={editorRef}></ReactEditor>
      <button id="readonly-btn" onClick={editableTog}>
        click
      </button>
    </div>
  );
}
