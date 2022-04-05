import React, { useState } from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { DOC } from "@/redux-api/docsApiType";

import DocMenu from "./Menu";

const styles = {
  rotation: {
    transform: "rotate(180deg)",
  },
  scale: {
    transform: "scaleY(1)",
    maxHeight: "1000px",
  },
  hide: {
    transform: "scaleY(0)",
    maxHeight: "0",
  },
};

function Subject({
  doc,
  handleShowMenu,
}: {
  doc: DOC;
  handleShowMenu: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    path: string[]
  ) => void;
}) {
  const { themes, curTheme } = useSelector(selectGlobalOpts);
  const { boxColor, headerTextColor } = themes[curTheme];

  const [expand, setExpand] = useState(false);

  const { rotation, scale, hide } = styles;

  return (
    <>
      <div key={doc.id} className="subject">
        <div
          className="subject-title"
          onClick={() => setExpand((v) => !v)}
          onContextMenu={(e) => handleShowMenu(e, doc.path)}
          style={{ backgroundColor: boxColor, color: headerTextColor }}
        >
          {doc.name}
          <span
            className="material-icons-outlined expand-icon"
            style={expand ? {} : rotation}
          >
            expand_less
          </span>
        </div>
        <div className="sub-children" style={expand ? scale : hide}>
          <DocMenu docs={doc.children} />
        </div>
      </div>
    </>
  );
}

export default React.memo(Subject);
