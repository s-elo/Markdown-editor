import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetDocMenuQuery,
  useDeleteDocMutation,
  useCopyCutDocMutation,
} from "@/redux-api/docsApi";
import {
  updateCopyCut,
  selectOperationMenu,
} from "@/redux-feature/operationMenuSlice";
import { getCurrentPath, isPathsRelated } from "@/utils/utils";
import { localStore } from "@/utils/utils";

import CreateDoc from "./CreateDoc";
import ModifyName from "./ModifyName";

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

export default React.memo(
  OperationMenu,
  // true will stop rendering
  (prevProps, nextProps) => prevProps.isShow === nextProps.isShow
);

function OperationMenu({
  isShow,
  xPos,
  yPos,
  path,
  // the click position is a file
  clickOnFile,
}: Props) {
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const { data: { norDocs } = { norDocs: {} } } = useGetDocMenuQuery();
  console.log("norDocs", norDocs);

  const { copyPath, cutPath, copyCutOnFile } = useSelector(selectOperationMenu);

  const [createFileShow, setCreateFileShow] = useState(false);
  const [createGroupShow, setCreateGroupShow] = useState(false);
  const [modifyNameShow, setModifyNameShow] = useState(false);

  const dispatch = useDispatch();

  const [deleteDoc] = useDeleteDocMutation();
  const [copyCutDoc] = useCopyCutDocMutation();

  const showManager = {
    creaetFile: setCreateFileShow,
    createGroup: setCreateGroupShow,
    modifyName: setModifyNameShow,
  };

  // show only one of the operations
  const showSelection = (key: keyof typeof showManager) => {
    Object.keys(showManager).forEach((item) => {
      if (item === key) showManager[item](true);
      else showManager[item as typeof key](false);
    });
  };

  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // for document.body only
    e.nativeEvent.stopImmediatePropagation();
  };

  /**
   * when click the copy, update the global copy path
   */
  const copyCutClick = (copyOrCut: "COPY" | "CUT") => {
    Toast("copying...", "SUCCESS");
    // hidden the menu
    document.body.click();

    dispatch(
      updateCopyCut({
        copyPath: copyOrCut === "COPY" ? path.join("-") : "",
        cutPath: copyOrCut === "CUT" ? path.join("-") : "",
        copyCutOnFile: clickOnFile,
      })
    );
  };

  const pasteClick = async () => {
    // hidden the menu
    document.body.click();
    // TO DO: move the doc
    const copyCutPath = copyPath === "" ? cutPath : copyPath;
    const copyCutFile = copyCutPath.split("-").slice(-1)[0];

    const pastePath = clickOnFile
      ? path.slice(0, path.length - 1).concat(copyCutFile)
      : path.concat(copyCutFile);

    try {
      await copyCutDoc({
        copyCutPath,
        pastePath: pastePath.join("-"),
        isCopy: cutPath === "",
        isFile: copyCutOnFile,
      }).unwrap();

      Toast("updated!", "SUCCESS");
    } catch {
      Toast("failed to copyCut...", "ERROR");
    }

    // clear the previous copy and cut
    dispatch(
      updateCopyCut({
        copyPath: "",
        cutPath: "",
        copyCutOnFile: false,
      })
    );
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

  const hiddenAll = () => {
    Object.keys(showManager).forEach((item) => {
      showManager[item as keyof typeof showManager](false);
    });
  };

  useEffect(() => {
    // all hidden
    document.addEventListener("click", () => {
      hiddenAll();
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // all hidden when click on other places
    hiddenAll();
    // eslint-disable-next-line
  }, [xPos, yPos]);

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
        {createFileShow && (
          <CreateDoc isFile={true} clickOnFile={clickOnFile} path={path} />
        )}
      </section>
      <section
        className="operations"
        onClick={() => showSelection("createGroup")}
      >
        create new group
        {createGroupShow && (
          <CreateDoc isFile={false} clickOnFile={clickOnFile} path={path} />
        )}
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => copyCutClick("COPY")}
        hidden={path.length === 0}
      >
        copy
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => copyCutClick("CUT")}
        hidden={path.length === 0}
      >
        cut
      </section>
      {/* hidden when no copying or cutting*/}
      <section
        className="operations"
        onClick={pasteClick}
        hidden={copyPath === "" && cutPath === ""}
      >
        paste
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => showSelection("modifyName")}
        hidden={path.length === 0}
      >
        rename
        {modifyNameShow && <ModifyName isFile={clickOnFile} path={path} />}
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={deleteDocClick}
        hidden={path.length === 0}
      >
        delete
      </section>
    </main>
  );
}
