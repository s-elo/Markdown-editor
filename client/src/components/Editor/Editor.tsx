import React, { useRef } from "react";
import {
  Editor,
  rootCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  defaultValueCtx,
} from "@milkdown/core";
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

import { EditorProps } from "./type";

import "./Editor.less";

export default function MarkdownEditor(props: EditorProps) {
  const { content, readonly } = props;

  const editorRef = useRef<EditorRef>(null);
  const editable = useRef(readonly);

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
      .use(gfm)
      .use(listener)
      .use(tooltip)
      .use(slash)
      .use(history)
      .use(emoji)
      .use(indent)
      .use(prism)
  );

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
