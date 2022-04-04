import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateGlobalOpts,
  selectGlobalOpts,
} from "@/redux-feature/globalOptsSlice";
import { selectCurDoc, updateIsDirty } from "@/redux-feature/curDocSlice";
import { useUpdateDocMutation } from "@/redux-api/docsApi";
import Toast from "@/utils/Toast";
import "./Header.less";

export default function Header() {
  const { isDarkMode, readonly, menuCollapse } = useSelector(selectGlobalOpts);
  const { isDirty, content, contentPath } = useSelector(selectCurDoc);

  const dispatch = useDispatch();
  const [
    updateDoc,
    // { isLoading }
  ] = useUpdateDocMutation();

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
