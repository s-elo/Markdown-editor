import React, { useEffect, useState } from "react";
import { useCreateFileMutation } from "@/redux-api/docsApi";

import "./operationMenu.less";

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
  const [createFileShow, setCreateFileShow] = useState(false);
  const [fileNameInput, setFileNameInput] = useState("");

  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  const [createDoc] = useCreateFileMutation();

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

  const createFileClick = () => {
    setCreateFileShow(true);
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
      <section className="operations" onClick={createFileClick}>
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
      <section className="operations">delete</section>
    </main>
  );
}
