import React, { useState } from "react";
import { DOC } from "@/redux-api/docsApiType";
import { useDispatch } from "react-redux";
import { updateOperationMenu } from "@/redux-feature/operationMenuSlice";

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

export default function Subject({ doc }: { doc: DOC }) {
  const [expand, setExpand] = useState(false);

  const { rotation, scale, hide } = styles;

  const dispatch = useDispatch();

  // handle right click and show the menu
  const handleShowMenu = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    path: string[]
  ) => {
    e.preventDefault();

    dispatch(
      updateOperationMenu({
        isShow: true,
        xPos: e.clientX,
        yPos: e.clientY,
        path,
        clickOnFile: false,
      })
    );
  };

  return (
    <>
      <div key={doc.id} className="subject">
        <div
          className="subject-title"
          onClick={() => setExpand((v) => !v)}
          onContextMenu={(e) => handleShowMenu(e, doc.path)}
        >
          {doc.dirName}
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
