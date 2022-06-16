import React from "react";
import { Link } from "react-router-dom";
import { useSaveDoc } from "@/utils/hooks/reduxHooks";
import Outline from "../Outline/Outline";

function FileLink({
  path,
  handleShowMenu,
}: {
  path: string[];
  handleShowMenu: (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    path: string[]
  ) => void;
}) {
  const saveDoc = useSaveDoc();

  return (
    <Link
      to={`/article/${path.join("-")}`}
      className={`link file`}
      onContextMenu={(e) => handleShowMenu(e, path)}
      onClick={saveDoc}
    >
      {path[path.length - 1]}
      <Outline
        containerDom={document.getElementById("container") as HTMLElement}
        path={path}
      />
    </Link>
  );
}

export default React.memo(FileLink);
