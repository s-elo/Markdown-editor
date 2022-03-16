import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useDeleteDocMutation } from "@/redux-api/docsApi";
import { getCurrentPath, isPathsRelated } from "@/utils/utils";
import { localStore } from "@/utils/utils";

import CreateDoc from "./CreateDoc";

import Toast from "@/utils/Toast";
import "./OperationMenu.less";

const { confirm } = window;

type Props = {
  isShow: boolean;
  xPos: number;
  yPos: number;
  path: string[];
  clickOnFile: boolean;
};

export default function OperationMenu({
  isShow,
  xPos,
  yPos,
  path,
  // the click position is a file
  clickOnFile,
}: Props) {
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const [createFileShow, setCreateFileShow] = useState(false);
  const [createGroupShow, setCreateGroupShow] = useState(false);

  const showManager = {
    creaetFile: setCreateFileShow,
    createGroup: setCreateGroupShow,
  };

  // show only one of the operations
  const showSelection = (key: keyof typeof showManager) => {
    Object.keys(showManager).forEach((item) => {
      if (item === key) showManager[item](true);
      else showManager[item as typeof key](false);
    });
  };

  const [deleteDoc] = useDeleteDocMutation();

  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // for document.body only
    e.nativeEvent.stopImmediatePropagation();
  };

  const deleteDocClick = async () => {
    try {
      const sure = confirm(
        `re you sure to delete the ${
          clickOnFile ? "file" : "group"
        } permanently?`
      );

      if (sure) {
        await deleteDoc({ path: path.join("-"), isFile: clickOnFile }).unwrap();
        // hidden the menu
        document.body.click();

        Toast("deleted!", "WARNING");

        const currentPath = getCurrentPath(pathname);

        // jump if the current doc is deleted or included in the deleted folder
        if (isPathsRelated(currentPath, path, clickOnFile)) {
          const { setStore: storeRecentPath } = localStore("recentPath");
          storeRecentPath(`/purePage`);

          routerHistory.push("/purePage");
        }
      }
    } catch {
      Toast("failed to delete...", "ERROR");
    }
  };

  useEffect(() => {
    // all hidden
    document.addEventListener("click", () => {
      Object.keys(showManager).forEach((item) => {
        showManager[item as keyof typeof showManager](false);
      });
    });
    // eslint-disable-next-line
  }, []);

  return (
    <main
      className="operation-menu"
      onClick={menuClick}
      style={{ display: isShow ? "flex" : "none", left: xPos, top: yPos }}
    >
      <section
        className="operations"
        onClick={() => showSelection("creaetFile")}
      >
        create new file
        <CreateDoc
          isFile={true}
          isShow={createFileShow}
          clickOnFile={clickOnFile}
          path={path}
        />
      </section>
      <section
        className="operations"
        onClick={() => showSelection("createGroup")}
      >
        create new group
        <CreateDoc
          isFile={false}
          isShow={createGroupShow}
          clickOnFile={clickOnFile}
          path={path}
        />
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={deleteDocClick}
        style={{ display: path.length === 0 ? "none" : "block" }}
      >
        delete
      </section>
    </main>
  );
}
