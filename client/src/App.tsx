import React from "react";
import EditorContainer from "./components/EditorContainer/EditorContainer";
import Menu from "./components/Menu/MenuContainer";
import { useShortCut } from "./utils/hooks";

import "./App.less";

export default function App() {
  useShortCut();

  return (
    <div className="container" id="container">
      <Menu />
      <EditorContainer />
    </div>
  );
}
