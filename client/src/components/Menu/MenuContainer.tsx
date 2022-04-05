import React, { useEffect } from "react";

import { useSelector, useDispatch } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import {
  updateOperationMenu,
  selectOperationMenu,
} from "@/redux-feature/operationMenuSlice";

import { useGetDocMenuQuery } from "@/redux-api/docsApi";

import Menu from "./Menu";
import OperationMenu from "../OperationMenu/OperationMenu";
import Spinner from "../Spinner/Spinner";

import "./MenuContainer.less";

export default function MenuContainer() {
  const {
    data: { docs } = { docs: [] },
    isFetching,
    isSuccess,
    isError,
  } = useGetDocMenuQuery();

  const { menuCollapse } = useSelector(selectGlobalOpts);
  const { isShow, xPos, yPos, path } = useSelector(selectOperationMenu);

  const dispatch = useDispatch();

  let html;
  if (isSuccess) {
    html = (
      <>
        <div className="content-header">Content</div>
        <br />
        <Menu docs={docs} />
      </>
    );
  } else if (isFetching) {
    html = <Spinner />;
  } else if (isError) {
    html = <div>Ops~</div>;
  }

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
      })
    );
  };

  // click elsewhere except the operation menu, close it
  useEffect(() => {
    document.addEventListener("click", () => {
      dispatch(
        updateOperationMenu({
          isShow: false,
          xPos: 0,
          yPos: 0,
          path: [],
        })
      );
    });
    // eslint-disable-next-line
  }, []);

  return (
    <>
      {isShow && (
        <OperationMenu xPos={xPos} yPos={yPos} path={path} />
      )}
      <div
        onContextMenu={(e) => handleShowMenu(e, [])}
        className={`menu-container scroll-bar ${
          menuCollapse ? "collapse" : ""
        }`}
      >
        {html}
      </div>
    </>
  );
}
