import React, { useState } from "react";
import MarkdownEditor from "./components/Editor/Editor";

import "./App.less";

export default function App() {
  const [readonly, setReadonly] = useState(true);
  const [content, setContent] = useState("## Hello World!");
  const getContent = (content: string) => {
    setContent(content);
  };

  return (
    <div className="container">
      <MarkdownEditor readonly={readonly} getContent={getContent} content={content}/>
    </div>
  );
}
