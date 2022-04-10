import React from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { selectCurDoc } from "@/redux-feature/curDocSlice";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

import "./DocMirror.less";
import { EditorWrappedRef } from "../EditorContainer/EditorContainer";

export type DocMirrorProps = {
  unmount: boolean;
  editorRef: React.RefObject<EditorWrappedRef>;
};

export default function DocMirror({ unmount, editorRef }: DocMirrorProps) {
  const { curTheme, isEditorBlur } =
    useSelector(selectGlobalOpts);
  const { content: globalContent } = useSelector(selectCurDoc);

  return (
    <div className="code-mirror-container">
      {/* doesnt need to render when it is at the backend */}
      {!unmount ? (
        <CodeMirror
          value={globalContent}
          theme={curTheme as "light" | "dark"}
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
          ]}
          onChange={(value) => {
            if (isEditorBlur && editorRef.current)
              editorRef.current.update(value);
          }}
        />
      ) : (
        ""
      )}
    </div>
  );
}
