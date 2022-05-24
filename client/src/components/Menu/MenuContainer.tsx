import React, { useEffect } from "react";

import { useSelector, useDispatch } from "react-redux";
import { selectMenuCollapse } from "@/redux-feature/globalOptsSlice";
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
    data: docs = [],
    isFetching,
    isSuccess,
    isError,
  } = useGetDocMenuQuery();

  const menuCollapse = useSelector(selectMenuCollapse);
  const { isShow, xPos, yPos, path } = useSelector(selectOperationMenu);

  const dispatch = useDispatch();

  let html;
  if (isSuccess) {
    html = <Menu docs={docs} />;
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
    const event = () => {
      // only dispatch when it is shown
      isShow &&
        dispatch(
          updateOperationMenu({
            isShow: false,
            xPos: 0,
            yPos: 0,
            path: [],
          })
        );
    };

    document.addEventListener("click", event);

    return () => {
      // remove the previous event when isShow changed
      document.removeEventListener("click", event);
    };
    // need the isShow as a closure to rebind the event
  }, [isShow, dispatch]);

  return (
    <>
      {isShow && <OperationMenu xPos={xPos} yPos={yPos} path={path} />}
      <div
        onContextMenu={(e) => handleShowMenu(e, [])}
        className="menu-container"
        style={{ width: menuCollapse ? "0%" : "18%" }}
      >
        {html}
      </div>
    </>
  );
}
