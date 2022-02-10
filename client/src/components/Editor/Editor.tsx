import React, { useState, useRef } from "react";
import {
  Editor,
  rootCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  defaultValueCtx,
} from "@milkdown/core";
import { nord } from "@milkdown/theme-nord";
import { ReactEditor, useEditor, EditorRef } from "@milkdown/react";
import { commonmark } from "@milkdown/preset-commonmark";
import { listener, listenerCtx } from "@milkdown/plugin-listener";

import { EditorProps } from "./type";

export default function MarkdownEditor(props: EditorProps) {
  const { content, readonly } = props;

  const editorRef = useRef<EditorRef>(null);
  const editable = React.useRef(!readonly);

  const editor = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        // when updated, get the string value of the markdown
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
          //   console.log(markdown);
          props.getContent(markdown);
        });
        // edit mode
        ctx.set(editorViewOptionsCtx, { editable: () => editable.current });

        ctx.set(defaultValueCtx, content);
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
  );

//   if (editorRef.current) {
//     (editorRef.current.get() as Editor).action((ctx) => {
//       const view = ctx.get(editorViewCtx);
//       view.updateState(view.state);
//     });
//   }

  return (
    <>
      <ReactEditor editor={editor} ref={editorRef} />
      <button
        onClick={() => {
          editable.current = !editable.current;
          if (editorRef.current) {
            (editorRef.current.get() as Editor).action((ctx) => {
              const view = ctx.get(editorViewCtx);
              view.updateState(view.state);
            });
          }
        }}
      >
        click
      </button>
    </>
  );
}
