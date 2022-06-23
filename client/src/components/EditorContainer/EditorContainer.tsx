import React, { useState, useRef } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurActiveTab } from "@/redux-feature/curDocSlice";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import MarkdownEditor from "../Editor/Editor";
import DocMirror from "../DocMirror/DocMirror";
import Header from "../Header/Header";
import ResizableBox from "../../utils/ResizableBox/ResizableBox";
import SidePannel from "../SidePannel/SidePannel";
import OpenTab from "../OpenTab/OpenTab";
import { smoothCollapse } from "@/utils/utils";

import "./EditorContainer.less";

export type EditorWrappedRef = {
  update: (newContent: string) => void;
};

export default function EditorContainer() {
  const curTab = useSelector(selectCurActiveTab);

  const editorRef = useRef<EditorWrappedRef>(null);

  const { mirrorCollapse } = useSelector(selectGlobalOpts);

  // just for hidden and show UI experience
  const [unmountMirror, setUnmountMirror] = useState(true);
  const [hideResizeBar, setHideResizeBar] = useState(false);

  const editorEffect = smoothCollapse(mirrorCollapse);
  const mirrorEffect = smoothCollapse(
    mirrorCollapse,
    // wait for the collapsing finishing then unmount the mirror and hide the bar
    () => {
      setUnmountMirror(true);
      setHideResizeBar(true);
    },
    // when to open the box, open the mirror and show the bar immediately
    () => {
      setUnmountMirror(false);
      setHideResizeBar(false);
    }
  );

  return (
    <div className="editor-container">
      <Header />
      <OpenTab />
      <main className="doc-area">
        <ResizableBox
          defaultWidth={[0.5, 0.5]}
          effects={[editorEffect, mirrorEffect]}
          effectsDeps={[mirrorCollapse]}
          boxStyles={[
            mirrorCollapse ? { width: "100%" } : {},
            mirrorCollapse ? { width: "0%" } : {},
          ]}
          resizeBarStyle={hideResizeBar ? { display: "none" } : {}}
        >
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
            <Redirect to={curTab ? `/article/${curTab.path}` : "/purePage"} />
          </Switch>
          <DocMirror editorRef={editorRef} unmount={unmountMirror} />
        </ResizableBox>
      </main>
      <SidePannel />
    </div>
  );
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};
