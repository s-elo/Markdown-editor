import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateGlobalOpts,
  selectGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import "./Header.less";

export default function Header() {
  const { isDarkMode, menuCollapse } = useSelector(selectGlobalOpts);

  const dispatch = useDispatch();

  return (
    <div className="header-container">
      <div className="btn-group">
        <button onClick={() => {}}>callsp</button>
      </div>
      <div className="btn-group">
        <button
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                isDarkMode: !isDarkMode,
                menuCollapse: menuCollapse,
              })
            );
          }}
        >
          {isDarkMode ? "light mode" : "dark mode"}
        </button>
      </div>
    </div>
  );
}
