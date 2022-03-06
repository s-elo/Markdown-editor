import React from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateOperationMenuConfig } from "@/redux-feature/globalOptsSlice";

import { DOC } from "@/redux-api/docsApiType";
import Subject from "./Subject";

function Menu({ docs }: { docs: DOC[] }) {
  const dispatch = useDispatch();

  // handle right click and show the menu
  const handleShowMenu = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();

    console.log(e.clientX, e.clientY);
    dispatch(
      updateOperationMenuConfig({
        isShow: true,
        xPos: e.clientX,
        yPos: e.clientY,
      })
    );
  };
  
  return (
    <>
      {docs.map((doc) =>
        doc.isFile ? (
          <Link
            to={`/article/${doc.path.join("-")}/${doc.id}`}
            className={`link file`}
            key={doc.id}
            onContextMenu={handleShowMenu}
          >
            {doc.id.split("-")[0]}
          </Link>
        ) : (
          <Subject doc={doc} key={doc.id} />
        )
      )}
    </>
  );
}

export default React.memo(Menu);
