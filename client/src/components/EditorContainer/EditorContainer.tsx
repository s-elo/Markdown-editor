import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "../Editor/Editor";

import { useGetDocsQuery } from "@/feature/docsApi";

export default function EditorContainer() {
  const { data: docs = [], isFetching, isSuccess, isError } = useGetDocsQuery();

  if (isSuccess) {
    console.log(docs);
  }
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
