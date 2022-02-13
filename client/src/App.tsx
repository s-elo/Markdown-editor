import React, { useState } from "react";
import { Link } from "react-router-dom";
import EditorContainer from "./components/EditorContainer/EditorContainer";
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
        <EditorContainer />
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
