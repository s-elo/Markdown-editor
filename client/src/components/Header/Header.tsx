import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateGlobalOpts,
  selectGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import { selectCurDoc } from "@/redux-feature/curDocSlice";

import {
  useSaveDoc,
  useSwitchReadonlyMode,
  useSwitchTheme,
} from "@/utils/hooks/reduxHooks";

import DocSearch from "../DocSearch/DocSearch";
import ImgSearch from "../ImgSearch/ImgSearch";
import UploadImg from "../UploadImg/UploadImg";

import "./Header.less";

export default function Header() {
  const { isDarkMode, readonly, menuCollapse, mirrorCollapse } =
    useSelector(selectGlobalOpts);

  const { isDirty } = useSelector(selectCurDoc);

  const saveDoc = useSaveDoc();
  const switchReadonlyMode = useSwitchReadonlyMode();
  const switchTheme = useSwitchTheme();

  const dispatch = useDispatch();

  return (
    <div className="header-container">
      <div className="btn-group">
        <span
          className="material-icons-outlined md-light icon-btn"
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ["menuCollapse"],
                values: [!menuCollapse],
              })
            );
          }}
          title="menu-toggle"
          role="button"
        >
          menu
        </span>
        <DocSearch />
        <UploadImg />
        <ImgSearch></ImgSearch>
      </div>
      <div className="btn-group">
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ["mirrorCollapse"],
                values: [!mirrorCollapse],
              })
            );
          }}
          title="code-mirror"
          role="button"
        >
          {mirrorCollapse ? "article" : "chrome_reader_mode"}
        </span>
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => saveDoc()}
          title="save"
          role="button"
        >
          {isDirty ? "save_as" : "save"}
        </span>
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => switchReadonlyMode()}
          title={readonly ? "edit" : "readonly"}
          role="button"
        >
          {readonly ? "visibility" : "mode_edit"}
        </span>
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => switchTheme()}
          title={isDarkMode ? "light-mode" : "dark-mode"}
          role="button"
        >
          {isDarkMode ? "dark_mode" : "light_mode"}
        </span>
      </div>
    </div>
  );
}
