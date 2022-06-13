import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetNorDocsQuery,
  useDeleteDocMutation,
  useCopyCutDocMutation,
} from "@/redux-api/docsApi";
import {
  updateCopyCut,
  selectOperationMenu,
} from "@/redux-feature/operationMenuSlice";
import { useDeleteHandler, useCopyCutHandler } from "@/utils/hooks/docHookds";

import CreateDoc from "./CreateDoc";
import ModifyName from "./ModifyName";

import Modal from "../Modal/Modal";
import Toast from "@/utils/Toast";
import "./OperationMenu.less";

type Props = {
  xPos: number;
  yPos: number;
  path: string[];
};

export default React.memo(
  OperationMenu,
  // true will stop rendering
  (prevProps, nextProps) =>
    prevProps.xPos === nextProps.xPos && prevProps.yPos === nextProps.yPos
);

function OperationMenu({ xPos, yPos, path }: Props) {
  const { data: norDocs = {} } = useGetNorDocsQuery();

  const copyCutHandler = useCopyCutHandler();
  const deleteHandler = useDeleteHandler();

  const { doc: norCurDoc, parent: curDocParent } =
    norDocs[path.join("-")] ?? {};

  const { copyPath, cutPath } = useSelector(selectOperationMenu);

  const [createFileShow, setCreateFileShow] = useState(false);
  const [createGroupShow, setCreateGroupShow] = useState(false);
  const [modifyNameShow, setModifyNameShow] = useState(false);

  const [deleteConfirmShow, setDeleteConfirmShow] = useState(false);

  const dispatch = useDispatch();

  const [deleteDocMutation] = useDeleteDocMutation();
  const [copyCutDoc] = useCopyCutDocMutation();

  const showManager = useMemo(
    () => ({
      creaetFile: setCreateFileShow,
      createGroup: setCreateGroupShow,
      modifyName: setModifyNameShow,
    }),
    [setCreateFileShow, setCreateGroupShow, setModifyNameShow]
  );

  // the click position is a file
  const clickOnFile = path.length === 0 ? false : norCurDoc.isFile;

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
      })
    );
  };

  const pasteClick = async () => {
    // hidden the menu
    document.body.click();
    // move the doc

    const copyCutPath = copyPath === "" ? cutPath : copyPath;
    const copyCutOnFile = norDocs[copyCutPath].doc.isFile;
    // file or dir
    const copyCutDocName = norDocs[copyCutPath].doc.name;

    // click on file or not
    const pastePath = norCurDoc
      ? norCurDoc.isFile
        ? path
            .slice(0, path.length - 1)
            .concat(copyCutDocName)
            .join("-")
        : path.concat(copyCutDocName).join("-")
      : copyCutDocName;

    // check if there is a repeat name
    if (norDocs[pastePath])
      return Toast("name already exsit in this folder!", "WARNING", 3000);

    try {
      await copyCutDoc({
        copyCutPath,
        pastePath: pastePath,
        isCopy: cutPath === "",
        isFile: copyCutOnFile,
      }).unwrap();

      copyCutHandler(copyCutPath, pastePath, copyPath === "", copyCutOnFile);

      Toast("updated!", "SUCCESS");
    } catch {
      Toast("failed to copyCut...", "ERROR");
    }

    // clear the previous copy and cut
    dispatch(
      updateCopyCut({
        copyPath: "",
        cutPath: "",
      })
    );
  };

  const deleteDoc = async () => {
    try {
      await deleteDocMutation({
        path: path.join("-"),
        isFile: clickOnFile,
      }).unwrap();
      // hidden the menu
      document.body.click();

      Toast("deleted!", "WARNING");

      // handle router issue
      deleteHandler(path.join("-"), clickOnFile);
    } catch {
      Toast("failed to delete...", "ERROR");
    }
  };

  const hiddenAll = useCallback(() => {
    Object.keys(showManager).forEach((item) => {
      showManager[item as keyof typeof showManager](false);
    });
  }, [showManager]);

  useEffect(() => {
    // all hidden
    document.addEventListener("click", hiddenAll);

    return () => {
      document.removeEventListener("click", hiddenAll);
    };
  }, [hiddenAll]);

  useEffect(() => {
    // all hidden when click on other places
    hiddenAll();
    // eslint-disable-next-line
  }, [xPos, yPos]);

  // make show direction flexible to avoid overflow
  const menuPos =
    yPos + 300 >= document.body.clientHeight
      ? {
          left: xPos,
          bottom: document.body.clientHeight - yPos,
        }
      : {
          left: xPos,
          top: yPos,
        };

  return (
    <main className="operation-menu" onClick={menuClick} style={menuPos}>
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
        {modifyNameShow && (
          <ModifyName
            isFile={clickOnFile}
            path={path}
            siblings={
              Array.isArray(curDocParent) ? curDocParent : curDocParent.children
            }
          />
        )}
      </section>
      {/* hidden when click from the root menu */}
      <section
        className="operations"
        onClick={() => setDeleteConfirmShow(true)}
        hidden={path.length === 0}
      >
        delete
        {deleteConfirmShow && (
          <Modal
            showControl={setDeleteConfirmShow}
            confirmCallback={() => deleteDoc()}
          >
            {`Are you sure to delete the ${clickOnFile ? "file" : "group"}?`}
          </Modal>
        )}
      </section>
    </main>
  );
}
