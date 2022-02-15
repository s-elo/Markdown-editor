import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocsQuery } from "@/redux-api/docsApi";

import Spinner from "../Spinner/Spinner";

import "./Menu.less";
import { DOC } from "@/redux-api/docsApiType";

export default function MenuContainer() {
  const { data: docs = [], isFetching, isSuccess, isError } = useGetDocsQuery();

  const { menuCollapse } = useSelector(selectGlobalOpts);

  let html;
  if (isSuccess) {
    html = (
      <>
        <div className="content-header">Content</div>
        <br />
        <Menu docs={docs} />
      </>
    );
  } else if (isFetching) {
    html = <Spinner />;
  } else if (isError) {
    html = <div>Ops~</div>;
  }

  return (
    <div
      className={`menu-container scroll-bar ${menuCollapse ? "collapse" : ""}`}
    >
      {html}
    </div>
  );
}

const Menu = ({ docs }: { docs: DOC[] }) => {
  return (
    <>
      {docs.map((doc) => {
        if (doc.isFile) {
          return (
            <Link
              to={`/article/${doc.path.join("-")}/${doc.id}`}
              className={`link file`}
              key={doc.id}
            >
              {doc.id.split("-")[0]}
            </Link>
          );
        }

        return <Subject doc={doc} key={doc.id} />;
      })}
    </>
  );
};

const Subject = ({ doc }: { doc: DOC }) => {
  const [expand, setExpand] = useState(false);

  const rotation = {
    transform: "rotate(180deg)",
  };

  const scale = {
    transform: "scaleY(1)",
    maxHeight: "1000px",
  };

  const hide = {
    transform: "scaleY(0)",
    maxHeight: "0",
  };

  return (
    <div key={doc.id} className="subject">
      <div className="subject-title" onClick={() => setExpand((v) => !v)}>
        {doc.dirName}
        <span
          className="material-icons-outlined expand-icon"
          style={expand ? {} : rotation}
        >
          {/* {expand ? "expand_less" : "expand_more"} */}
          expand_less
        </span>
      </div>
      <div className="sub-children" style={expand ? scale : hide}>
        <Menu docs={doc.children} />
      </div>
    </div>
  );
};
