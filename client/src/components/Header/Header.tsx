import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateGlobalOpts,
  selectGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import { selectCurDoc, updateIsDirty } from "@/redux-feature/curDocSlice";
import { useUpdateDocMutation } from "@/redux-api/docsApi";
import { localStore } from "@/utils/utils";
import Toast from "@/utils/Toast";
import "./Header.less";

export default function Header() {
  const { isDarkMode, readonly, menuCollapse, themes, curTheme } =
    useSelector(selectGlobalOpts);
  const { backgroundColor } = themes[curTheme];
  const { setStore: setTheme } = localStore("theme");

  const { isDirty, content, contentPath } = useSelector(selectCurDoc);

  const dispatch = useDispatch();
  const [
    updateDoc,
    // { isLoading }
  ] = useUpdateDocMutation();

  return (
    <div className="header-container" style={{ backgroundColor }}>
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
        >
          {readonly ? "visibility" : "mode_edit"}
        </span>
        <span
          className="material-icons-outlined icon-btn"
          onClick={() => {
            dispatch(
              updateGlobalOpts({
                keys: ["isDarkMode", "curTheme"],
                values: [!isDarkMode, isDarkMode ? "light" : "dark"],
              })
            );

            setTheme((!isDarkMode).toString());
          }}
        >
          {isDarkMode ? "dark_mode" : "light_mode"}
        </span>
      </div>
    </div>
  );
}
