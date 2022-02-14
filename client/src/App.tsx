import React from "react";
import EditorContainer from "./components/EditorContainer/EditorContainer";
import Menu from "./components/Menu/Menu";

import "./App.less";

export default function App() {
  return (
    <div className="container">
      <Menu />
      <EditorContainer />
    </div>
  );
}
