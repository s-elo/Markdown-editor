import React from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { Link } from "react-router-dom";

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
  const { themes, curTheme } = useSelector(selectGlobalOpts);
  const { contentTextColor } = themes[curTheme];

  return (
    <Link
      to={`/article/${path.join("-")}`}
      className={`link file`}
      onContextMenu={(e) => handleShowMenu(e, path)}
      style={{ color: contentTextColor }}
    >
      {path[path.length - 1]}
    </Link>
  );
}

export default React.memo(FileLink);
