import React from "react";

import "./OpenTab.less";

const tabs = [
  {
    path: "test-testasdasdasdasdasd",
    active: false,
  },
  {
    path: "test-test",
    active: false,
  },
  {
    path: "test-test",
    active: true,
  },
  {
    path: "test-test",
    active: false,
  },
];

export default function OpenTab() {
  return (
    <div className="open-tab-container">
      {tabs.map(({ path, active }) => (
        <div
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
