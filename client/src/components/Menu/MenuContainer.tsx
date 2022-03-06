import React, { useEffect } from "react";

import { useSelector, useDispatch } from "react-redux";
import {
  selectGlobalOpts,
  updateOperationMenuConfig,
} from "@/redux-feature/globalOptsSlice";
import { useGetDocsQuery } from "@/redux-api/docsApi";

import Menu from "./Menu";
import OperationMenu from "./OperationMenu";
import Spinner from "../Spinner/Spinner";

import "./MenuContainer.less";

export default function MenuContainer() {
  const { data: docs = [], isFetching, isSuccess, isError } = useGetDocsQuery();

  const {
    menuCollapse,
    operationMenuConfig: { isShow, xPos, yPos },
  } = useSelector(selectGlobalOpts);

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
      dispatch(updateOperationMenuConfig({ isShow: false, xPos: 0, yPos: 0 }));
    });
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <OperationMenu showMenu={isShow} xPos={xPos} yPos={yPos} />
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
