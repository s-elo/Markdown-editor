import React from "react";
import { useSelector } from "react-redux";
import { selectCurTabs } from "@/redux-feature/curDocSlice";
import "./OpenTab.less";

export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);

  return (
    <div className="open-tab-container">
      {curTabs.map(({ path, active }) => (
        <div
          key={path}
          className={`open-tab ${active ? "active-tab" : ""}`}
          title={path.replaceAll("-", "/") + ".md"}
        >
          <span className="tab-name">
            {path.split("-").slice(-1)[0] + ".md"}
          </span>
          <span className="close-tag">×</span>
        </div>
      ))}
    </div>
  );
}
