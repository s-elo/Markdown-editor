import React from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "./redux-feature/globalOptsSlice";
import EditorContainer from "./components/EditorContainer/EditorContainer";
import Menu from "./components/Menu/MenuContainer";

import "./App.less";

export default function App() {
  const { themes, curTheme } = useSelector(selectGlobalOpts);
  const { backgroundColor } = themes[curTheme];

  return (
    <div className="container" id='container' style={{ backgroundColor }}>
      <Menu />
      <EditorContainer />
    </div>
  );
}
