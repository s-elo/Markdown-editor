import React from "react";
import { useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurTabs } from "@/redux-feature/curDocSlice";
import { useDeleteTab, useSaveDoc } from "@/utils/hooks/reduxHooks";
import "./OpenTab.less";

export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);

  const router = useHistory();

  const deleteTab = useDeleteTab();

  const saveDoc = useSaveDoc();

  return (
    <div className="open-tab-container">
      {curTabs.map(({ path, active }) => (
        <div
          key={path}
          className={`open-tab ${active ? "active-tab" : ""}`}
          title={path.replaceAll("-", "/") + ".md"}
          onClick={() => {
            // auto save when switch
            saveDoc();
            router.push(`/article/${path}`);
          }}
        >
          <span className="tab-name">
            {path.split("-").slice(-1)[0] + ".md"}
          </span>
          <span
            className="close-tag"
            onClick={(e) => {
              e.stopPropagation();
              deleteTab(path);
            }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  );
}
