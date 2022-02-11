import React, { useState } from "react";
import { Link, Switch, Route, Redirect } from "react-router-dom";
import MarkdownEditor from "./components/Editor/Editor";

import "./App.less";

// create a context
export const globalOptCtx = React.createContext<{
  isDarkMode: boolean;
  readonly: boolean;
}>({ isDarkMode: true, readonly: false });
const { Provider } = globalOptCtx;

export default function App() {
  // const [readonly, setReadonly] = useState(true);
  const [globalOptCtx, setGlobalOptCtx] = useState({
    isDarkMode: true,
    readonly: false,
  });
  // const [content, setContent] = useState("## Hello World!");
  // const getContent = (content: string) => {
  //   setContent(content);
  // };

  return (
    <div className="container">
      <Provider value={globalOptCtx}>
        <Link to="/article/a1" className="link">
          a1
        </Link>
        <Link to="/article/a2" className="link">
          a2
        </Link>
        <Switch>
          <Route
            exact
            path={`/article/:contentId`}
            component={MarkdownEditor}
            key="/article"
          />
          <Redirect to="/article/a1" />
        </Switch>
        <button
          onClick={() => {
            setGlobalOptCtx((opt) => ({
              isDarkMode: !opt.isDarkMode,
              readonly: opt.readonly,
            }));
          }}
        >
          dark
        </button>
      </Provider>
    </div>
  );
}
