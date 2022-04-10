import React, { useRef } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import MarkdownEditor from "../Editor/Editor";
import DocMirror from "../DocMirror/DocMirror";
import Header from "../Header/Header";
import ResizableBox from "../ResizableBox/ResizableBox";
import { localStore } from "@/utils/utils";

import "./EditorContainer.less";

export type EditorWrappedRef = {
  update: (newContent: string) => void;
};

export default function EditorContainer() {
  const { value: recentPath } = localStore("recentPath");

  const containerRef = useRef<HTMLElement>(null);
  const editorRef = useRef<EditorWrappedRef>(null);

  const { mirrorCollapse } = useSelector(selectGlobalOpts);

  return (
    <div className="editor-container">
      <Header />
      <main className="doc-area" ref={containerRef}>
        <ResizableBox
          leftBox={() => (
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
          )}
          rightBox={() => <DocMirror editorRef={editorRef} />}
          rightStyle={mirrorCollapse ? { width: "0%" } : {}}
          rightBoxEffect={(mirrorContainerRef) => {
            // only called when switching the collapse state
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
          }}
          rightBoxEffectDeps={[mirrorCollapse]}
          resizeBarStyle={mirrorCollapse ? { display: "none" } : {}}
        />
      </main>
    </div>
  );
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};
