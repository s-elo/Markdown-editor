import React from "react";
import { useDispatch } from "react-redux";
import { updateOperationMenu } from "@/redux-feature/operationMenuSlice";

import { DOC } from "@/redux-api/docsApiType";
import Subject from "./Subject";
import FileLink from "./FileLink";

export default function Menu({ docs }: { docs: DOC[] }) {
  const dispatch = useDispatch();

  // handle right click and show the menu
  // useCallback to memory the reference of the callback
  // so that as a prop it will not be considered as changed
  const handleShowMenu = React.useCallback(
    (e: React.MouseEvent<HTMLElement, MouseEvent>, path: string[]) => {
      e.preventDefault();
      e.stopPropagation();

      dispatch(
        updateOperationMenu({
          isShow: true,
          xPos: e.clientX,
          yPos: e.clientY,
          path,
        })
      );
    },
    [dispatch]
  );

  return (
    <>
      {docs.map((doc) =>
        doc.isFile ? (
          <FileLink
            path={doc.path}
            handleShowMenu={handleShowMenu}
            key={doc.id}
          />
        ) : (
          <Subject doc={doc} handleShowMenu={handleShowMenu} key={doc.id} />
        )
      )}
    </>
  );
}

// export default React.memo(Menu);

// export default React.memo(Menu, (prevProps, nextProps) => {
//   /*
//   如果把 nextProps 传入 render 方法的返回结果与
//   将 prevProps 传入 render 方法的返回结果一致则返回 true，
//   否则返回 false
//   */
//   console.log(prevProps === nextProps);
//   return prevProps === nextProps;
// });
