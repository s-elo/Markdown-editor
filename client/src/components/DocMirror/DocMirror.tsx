import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { selectCurDoc } from "@/redux-feature/curDocSlice";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

import "./DocMirror.less";
import { EditorWrappedRef } from "../EditorContainer/EditorContainer";

export type DocMirrorProps = {
  width: string;
  editorRef: React.RefObject<EditorWrappedRef>;
};

export default function DocMirror({ width, editorRef }: DocMirrorProps) {
  const { mirrorCollapse, curTheme, isEditorBlur } =
    useSelector(selectGlobalOpts);
  const { content: globalContent } = useSelector(selectCurDoc);

  const mirrorContainerRef = useRef<HTMLDivElement>(null);

  // only called when switching the collapse state
  useEffect(() => {
    const { current } = mirrorContainerRef;
    if (mirrorCollapse) {
      // when collapsing, add transition immediately
      if (!current) return;
      current.style.transition = "all 0.4s ease-in-out";
    } else {
      // when opening the mirror, after finishing the transition (wati >= 0.4s)
      // remove the transition for the dragging
      const timer = setTimeout(() => {
        if (current) current.style.transition = "none";

        clearTimeout(timer);
      }, 500);
    }
  }, [mirrorCollapse]);

  return (
    <div
      className="code-mirror-container"
      style={{ width: mirrorCollapse ? "0%" : width }}
      ref={mirrorContainerRef}
    >
      {/* doesnt need to render when it is at the backend */}
      {!mirrorCollapse ? (
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
