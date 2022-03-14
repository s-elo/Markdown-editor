import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  useCreateDocMutation,
  useDeleteDocMutation,
} from "@/redux-api/docsApi";
import { getCurrentPath, isPathsRelated } from "@/utils/utils";

import "./operationMenu.less";

const { confirm } = window;

type Props = {
  showMenu: boolean;
  xPos: number;
  yPos: number;
  path: string[];
  clickOnFile: boolean;
};

export default function OperationMenu({
  showMenu,
  xPos,
  yPos,
  path,
  // the click position is a file
  clickOnFile,
}: Props) {
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const [createFileShow, setCreateFileShow] = useState(false);
  const [fileNameInput, setFileNameInput] = useState("");

  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  const [createDoc] = useCreateDocMutation();
  const [deleteDoc] = useDeleteDocMutation();

  const createFileConfirm = async () => {
    // remove the last path which is the clicked file name
    if (clickOnFile) {
      path = path.slice(0, path.length - 1);
    }

    // add the new file name
    path = path.concat(fileNameInput);

    console.log("create a new file", path.join("-"));

    try {
      await createDoc({ path: path.join("-"), isFile: true }).unwrap();
      // hidden
      setCreateFileShow(false);
      document.body.click();

      alert("created");
    } catch {
      alert("failed to create...");
    }
  };

  const createDocClick = () => {
    setCreateFileShow(true);
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

        // jump if the current doc is deleted
        const currentPath = getCurrentPath(pathname);

        if (isPathsRelated(currentPath, path, clickOnFile)) {
          routerHistory.push("/purePage");
        }
      }
    } catch {
      alert("failed to delete...");
    }
  };

  useEffect(() => {
    // all hidden
    document.addEventListener("click", () => {
      setCreateFileShow(false);
    });
  }, []);

  return (
    <main
      className="operation-menu"
      onClick={menuClick}
      style={{ display: showMenu ? "flex" : "none", left: xPos, top: yPos }}
    >
      <section className="operations" onClick={createDocClick}>
        create new file
        <div
          className="new-file-group-title"
          style={{ display: createFileShow ? "flex" : "none" }}
        >
          <input
            type="text"
            onChange={(e) => setFileNameInput(e.target.value)}
            value={fileNameInput}
            className="input"
            placeholder="file name"
          />
          <button className="btn" onClick={createFileConfirm}>
            confirm
          </button>
        </div>
      </section>
      <section className="operations">create new group</section>
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
