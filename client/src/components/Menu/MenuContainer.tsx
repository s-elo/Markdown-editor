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
    data: docs = [],
    isFetching,
    isSuccess,
    isError,
  } = useGetDocMenuQuery();

  const { menuCollapse } = useSelector(selectGlobalOpts);
  const { isShow, xPos, yPos, path, clickOnFile } =
    useSelector(selectOperationMenu);

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

  // click elsewhere except the operation menu, close it
  useEffect(() => {
    document.addEventListener("click", () => {
      dispatch(
        updateOperationMenu({
          isShow: false,
          xPos: 0,
          yPos: 0,
          clickOnFile: false,
          path: [],
        })
      );
    });
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <OperationMenu
        showMenu={isShow}
        xPos={xPos}
        yPos={yPos}
        path={path}
        clickOnFile={clickOnFile}
      />
      <div
        className={`menu-container scroll-bar ${
          menuCollapse ? "collapse" : ""
        }`}
      >
        {html}
      </div>
    </>
  );
}