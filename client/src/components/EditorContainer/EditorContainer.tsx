import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "../Editor/Editor";
import Header from "../Header/Header";

import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";

import "./EditorContainer.less";

export default function EditorContainer() {
  const { menuCollapse } = useSelector(selectGlobalOpts);

  return (
    <div
      className={`editor-container scroll-bar ${
        menuCollapse ? "collapse" : ""
      }`}
    >
      <Header />
      <Switch>
        <Route
          exact
          path={`/article/:contentPath/:contentId`}
          component={MarkdownEditor}
          key="/article"
        />
        <Redirect to="/" />
      </Switch>
    </div>
  );
}
