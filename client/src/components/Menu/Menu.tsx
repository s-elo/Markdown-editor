import React, {useRef} from "react";
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
  console.log(menuCollapse)
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

        return (
          <div key={doc.id} className="subject">
            <div className="subject-title">{doc.dirName}</div>
            <div className="sub-children">
              <Menu docs={doc.children} />
            </div>
          </div>
        );
      })}
    </>
  );
};
