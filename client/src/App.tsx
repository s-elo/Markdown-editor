import React, { useState } from "react";
import { Link } from "react-router-dom";
import EditorContainer from "./components/EditorContainer/EditorContainer";
import Menu from "./components/Menu/Menu";

import "./App.less";

// create a context
export const globalOptCtx = React.createContext<{
  isDarkMode: boolean;
  readonly: boolean;
}>({ isDarkMode: true, readonly: false });
const { Provider } = globalOptCtx;

export default function App() {
  const [globalOptCtx, setGlobalOptCtx] = useState({
    isDarkMode: true,
    readonly: false,
  });

  return (
    <div className="container">
      <Provider value={globalOptCtx}>
        <Menu />
        <EditorContainer />
        {/* <button
          onClick={() => {
            setGlobalOptCtx((opt) => ({
              isDarkMode: !opt.isDarkMode,
              readonly: opt.readonly,
            }));
          }}
        >
          dark
        </button> */}
      </Provider>
    </div>
  );
}
