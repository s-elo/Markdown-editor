import React from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateOperationMenu } from "@/redux-feature/operationMenuSlice";

import { DOC } from "@/redux-api/docsApiType";
import Subject from "./Subject";

function Menu({ docs }: { docs: DOC[] }) {
  const dispatch = useDispatch();

  // handle right click and show the menu
  const handleShowMenu = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    path: string[]
  ) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch(
      updateOperationMenu({
        isShow: true,
        xPos: e.clientX,
        yPos: e.clientY,
        path,
        clickOnFile: true,
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
            onContextMenu={(e) => handleShowMenu(e, doc.path)}
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

// export default React.memo(Menu, (prevProps, nextProps) => {
//   /*
//   如果把 nextProps 传入 render 方法的返回结果与
//   将 prevProps 传入 render 方法的返回结果一致则返回 true，
//   否则返回 false
//   */
//   console.log(prevProps === nextProps);
//   return prevProps === nextProps;
// });
