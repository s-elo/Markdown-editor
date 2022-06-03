import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateGlobalOpts,
  selectGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import { selectCurDoc, updateIsDirty } from "@/redux-feature/curDocSlice";
import { useUpdateDocMutation } from "@/redux-api/docsApi";
import { useGetGitStatusQuery } from "@/redux-api/gitApi";

import { localStore, changeTheme } from "@/utils/utils";

import GitBox from "../GitBox/GitBox";
import SearchBar from "../SearchBar/SearchBar";
import ImgSearch from "../ImgSearch/ImgSearch";
import UploadImg from "../UploadImg/UploadImg";

import Toast from "@/utils/Toast";
import "./Header.less";

export default function Header() {
  const { isDarkMode, readonly, menuCollapse, mirrorCollapse } =
    useSelector(selectGlobalOpts);
  const { setStore: setTheme } = localStore("theme");

  const { isDirty, content, contentPath } = useSelector(selectCurDoc);

  const { data: { changes, noGit } = { changes: false, noGit: false } } =
    useGetGitStatusQuery();

  const dispatch = useDispatch();
  const [
    updateDoc,
    // { isLoading }
  ] = useUpdateDocMutation();

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
        <SearchBar />
        <UploadImg />
        <ImgSearch></ImgSearch>
      </div>
      <div className="btn-group">
        {noGit ? (
          ""
        ) : (
          <span
            title="git-sync"
            role="button"
            className="material-icons-outlined icon-btn"
          >
            {changes ? "sync_problem" : "sync"}
            <GitBox />
          </span>
        )}
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
          onClick={async () => {
            if (!isDirty) return;

            try {
              await updateDoc({
                modifyPath: contentPath,
                newContent: content,
              }).unwrap();

              // pop up to remind that is saved
              Toast("saved", "SUCCESS");

              // after updated, it should not be dirty
              dispatch(updateIsDirty({ isDirty: false }));
            } catch (err) {
              Toast("Failed to save...", "ERROR");
            }
          }}
          title="save"
          role="button"
        >
          {isDirty ? "save_as" : "save"}
        </span>
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
          title={readonly ? "edit" : "readonly"}
          role="button"
        >
          {readonly ? "visibility" : "mode_edit"}
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
            changeTheme(isDarkMode ? "light" : "dark");
            setTheme(isDarkMode ? "light" : "dark");
          }}
          title={isDarkMode ? "light-mode" : "dark-mode"}
          role="button"
        >
          {isDarkMode ? "dark_mode" : "light_mode"}
        </span>
      </div>
    </div>
  );
}
