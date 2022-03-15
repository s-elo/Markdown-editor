import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "../Editor/Editor";
import Header from "../Header/Header";

import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";

import { localStore } from "@/utils/utils";

import "./EditorContainer.less";

export default function EditorContainer() {
  const { menuCollapse } = useSelector(selectGlobalOpts);

  const { value: recentPath } = localStore("recentPath");

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
          path={`/article/:contentPath`}
          component={MarkdownEditor}
          key="/article"
        />
        <Route exact path={`/purePage`} component={PurePage} key="/purePage" />
        <Redirect to={recentPath || "/purePage"} />
      </Switch>
    </div>
  );
}

export const PurePage = () => {
  return <div className="pure-page">Just pick one!</div>;
};
