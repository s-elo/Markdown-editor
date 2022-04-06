import React from "react";
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

  const style = {
    transition: mirrorCollapse ? "all 0.4s ease-in-out" : "none",
    width: mirrorCollapse ? "0%" : width,
  };

  return (
    <div className="code-mirror-container" style={style}>
      <CodeMirror
        value={code}
        extensions={[markdown({ base: markdownLanguage })]}
      />
    </div>
  );
}