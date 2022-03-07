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
  const handleShowMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();

    dispatch(
      updateOperationMenu({
        isShow: true,
        xPos: e.clientX,
        yPos: e.clientY,
      })
    );
  };

  return (
    <>
      <div key={doc.id} className="subject">
        <div
          className="subject-title"
          onClick={() => setExpand((v) => !v)}
          onContextMenu={handleShowMenu}
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
