import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
// import { languages } from '@codemirror/language-data';
import "./DocMirror.less";

const code = `## Title

\`\`\`jsx
function Demo() {
  return <div>demo</div>
}
\`\`\`

\`\`\`bash
# Not dependent on uiw.
npm install @codemirror/lang-markdown --save
npm install @codemirror/language-data --save
\`\`\`

[weisit ulr](https://uiwjs.github.io/react-codemirror/)

\`\`\`go
package main
import "fmt"
func main() {
  fmt.Println("Hello, 世界")
}
\`\`\`
`;

export default function DocMirror({ width }: { width: string }) {
  const { mirrorCollapse } = useSelector(selectGlobalOpts);

  const mirrorRef = useRef<HTMLDivElement>(null);

  // only called when switching the collapse state
  useEffect(() => {
    if (mirrorCollapse) {
      // when collapsing, add transition immediately
      if (mirrorRef.current)
        mirrorRef.current.style.transition = "all 0.4s ease-in-out";
    } else {
      // when opening the mirror, after finishing the transition (wati >= 0.4s)
      // remove the transition for the dragging
      const timer = setTimeout(() => {
        if (mirrorRef.current) mirrorRef.current.style.transition = "none";

        clearTimeout(timer);
      }, 500);
    }
  }, [mirrorCollapse]);

  return (
    <div
      className="code-mirror-container"
      style={{ width: mirrorCollapse ? "0%" : width }}
      ref={mirrorRef}
    >
      <CodeMirror
        value={code}
        extensions={[markdown({ base: markdownLanguage })]}
      />
    </div>
  );
}
