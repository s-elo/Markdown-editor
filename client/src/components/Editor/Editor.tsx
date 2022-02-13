import React, { useEffect, useRef, useContext } from "react";
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

import slash from "./slashCofig";
import tooltip from "./tooltipConfig";

import { globalOptCtx } from "@/App";
import { ContentCacheType } from "./type";

import "./Editor.less";

const contentCache: ContentCacheType = {};
const isDirty = ({
  savedContent,
  editedContent,
}: {
  savedContent: string;
  editedContent: string;
}) => savedContent !== editedContent;

const getNord = (isDarkMode: boolean) => {
  return isDarkMode ? nord : nordLight;
};

export default function MarkdownEditor(
  props: RouteComponentProps<{ contentPath: string; contentId: string }>
) {
  const { contentPath, contentId } = props.match.params;

  const editorRef = useRef<EditorRef>(null);
  const editable = useRef(false);
  const { isDarkMode } = useContext(globalOptCtx);

  const editor = useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          // when updated, get the string value of the markdown
          ctx
            .get(listenerCtx)
            .markdownUpdated((ctx, markdown, prevMarkdown) => {
              // the first time
              if (!contentCache[contentId]) return;

              contentCache[contentId].editedContent = markdown;

              if (isDirty(contentCache[contentId])) {
                // change the saved status
              }
            });

          // edit mode
          ctx.set(editorViewOptionsCtx, { editable: () => editable.current });

          ctx.set(
            defaultValueCtx,
            // dark mode changed, remain the same editing content
            contentCache[contentId] ? contentCache[contentId].editedContent : ""
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

      // update the cache
      contentCache[contentId] = {
        savedContent: content,
        editedContent: content,
      };
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
  // only excute when the contentId is changed
  useEffect(() => {
    // get from the cache
    // when switch back from other articles, it should be shown the saved content
    if (contentCache[contentId]) {
      return updateContent(contentCache[contentId].savedContent);
    }

    fetch(`http://localhost:5620/getDocs/article?filePath=${contentPath}`)
      .then(async (res) => {
        const data = await res.json();

        updateContent(data.content);
      })
      .catch((err) => {
        console.log(err);
      });
    // eslint-disable-next-line
  }, [contentId]);

  return (
    <div className="editor-box">
      <ReactEditor editor={editor} ref={editorRef}></ReactEditor>
      <button id="readonly-btn" onClick={editableTog}>
        click
      </button>
    </div>
  );
}
