import React from "react";
import { useCreateFileMutation } from "@/redux-api/docsApi";

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
  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  const [createDoc] = useCreateFileMutation();

  const createFile = async () => {
    console.log("create a new file", path);

    // remove the last path which is the clicked file name
    if (clickOnFile) {
      path = path.slice(0, path.length - 1);
    }

    await createDoc({ path: path.join("-"), isFile: true });

    console.log("created");
  };

  return (
    <main
      className="operation-menu"
      onClick={menuClick}
      style={{ display: showMenu ? "flex" : "none", left: xPos, top: yPos }}
    >
      <section className="operations" onClick={createFile}>
        create new file
      </section>
      <section className="operations">create new group</section>
      <section className="operations">delete</section>
    </main>
  );
}
