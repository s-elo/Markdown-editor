import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useGetDocMenuQuery } from "@/redux-api/docsApi";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { Link } from "react-router-dom";
import Outline from "./Outline";

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
  const { data: { norDocs } = { norDocs: {} } } = useGetDocMenuQuery();

  const { themes, curTheme } = useSelector(selectGlobalOpts);
  const { contentTextColor, headerTextColor } = themes[curTheme];

  const [outlineShow, setOutlineShow] = useState(false);
  const [outlinePos, setOutlinePos] = useState({
    clientX: 0,
    clientY: 0,
  });

  const showOutline = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = e;
    setOutlinePos({ clientX, clientY });
    setOutlineShow(true);
  };

  return (
    <Link
      to={`/article/${path.join("-")}`}
      className={`link file`}
      onContextMenu={(e) => handleShowMenu(e, path)}
      style={{ color: contentTextColor }}
    >
      {path[path.length - 1]}
      <span
        style={{ color: headerTextColor }}
        className="material-icons-outlined show-outline-icon"
        onClick={showOutline}
        title="outline"
      >
        {"segment"}
      </span>
      {outlineShow && (
        <Outline
          containerDom={document.getElementById("container") as HTMLElement}
          mousePos={outlinePos}
          setOutlineShow={setOutlineShow}
          headings={norDocs[path.join("-")].headings}
        />
      )}
    </Link>
  );
}

export default React.memo(FileLink);
