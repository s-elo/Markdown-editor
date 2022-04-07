import React, { useRef, useState } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "../Editor/Editor";
import DocMirror from "../DocMirror/DocMirror";
import Header from "../Header/Header";
import ResizeBar from "./ResizeBar";

import { localStore } from "@/utils/utils";

import "./EditorContainer.less";

export type EditorWrappedRef = {
  update: (newContent: string) => void;
};

export default function EditorContainer() {
  const [mirrorWidth, setMirrorWidth] = useState("50%");

  const { value: recentPath } = localStore("recentPath");

  const containerRef = useRef<HTMLElement>(null);
  const editorRef = useRef<EditorWrappedRef>(null);

  return (
    <div className="editor-container">
      <Header />
      <main className="doc-area" ref={containerRef}>
        <Switch>
          <Route exact path={`/article/:contentPath`} key="/article">
            <MarkdownEditor ref={editorRef} />
          </Route>
          <Route
            exact
            path={`/purePage`}
            component={PurePage}
            key="/purePage"
          />
          <Redirect to={recentPath || "/purePage"} />
        </Switch>
        <ResizeBar
          containerRef={containerRef}
          widthChange={(mirrorWidth: string) => setMirrorWidth(mirrorWidth)}
        />
        <DocMirror width={mirrorWidth} editorRef={editorRef} />
      </main>
    </div>
  );
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};
