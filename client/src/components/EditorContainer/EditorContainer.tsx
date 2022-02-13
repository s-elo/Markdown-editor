import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "../Editor/Editor";

import "./EditorContainer.less";

export default function EditorContainer() {
  return (
    <div className="editor-container scroll-bar">
      <Switch>
        <Route
          exact
          path={`/article/:contentPath/:contentId`}
          component={MarkdownEditor}
          key="/article"
        />
        <Redirect to="/article/a1" />
      </Switch>
    </div>
  );
}
