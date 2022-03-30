import React from "react";
import { Link } from "react-router-dom";

function FileLink({
  path,
  handleShowMenu,
}: {
  path: string[];
  handleShowMenu: (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    path: string[],
    clickOnFile: boolean
  ) => void;
}) {
  return (
    <Link
      to={`/article/${path.join("-")}`}
      className={`link file`}
      onContextMenu={(e) => handleShowMenu(e, path, true)}
    >
      {path[path.length - 1]}
    </Link>
  );
}

export default React.memo(FileLink);
