import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "../Editor/Editor";
import Spinner from "../Spinner/Spinner";
import { useGetDocsQuery } from "@/redux-api/docsApi";

import "./EditorContainer.less";

export default function EditorContainer() {
  return (
    <div className="editor-container">
      <Switch>
        <Route
          exact
          path={`/article/:contentId`}
          component={MarkdownEditor}
          key="/article"
        />
        <Redirect to="/article/a1" />
      </Switch>
    </div>
  );
}
