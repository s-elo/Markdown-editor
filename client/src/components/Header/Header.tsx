import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateGlobalOpts,
  selectGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import "./Header.less";

export default function Header() {
  const { isDarkMode, readonly, menuCollapse } = useSelector(selectGlobalOpts);

  const dispatch = useDispatch();

  return (
    <div className="header-container">
      <div className="btn-group">
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ["menuCollapse"],
                values: [!menuCollapse],
              })
            );
          }}
        >
          menu
        </span>
      </div>
      <div className="btn-group">
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ["readonly"],
                values: [!readonly],
              })
            );
          }}
        >
          {readonly ? "mode_edit" : "visibility"}
        </span>
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ["isDarkMode"],
                values: [!isDarkMode],
              })
            );
          }}
        >
          {isDarkMode ? "light_mode" : "dark_mode"}
        </span>
      </div>
    </div>
  );
}
