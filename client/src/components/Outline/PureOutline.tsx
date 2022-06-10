import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { getCurrentPath } from "@/utils/utils";

export type PureOutlineProps = {
  headings: string[];
  keywords: string[];
  path: string[];
};

const headingSize = [
  {
    fontSize: "20px",
    fontWeight: "bold",
  },
  {
    fontSize: "16px",
    fontWeight: "bold",
    marginLeft: "1rem",
  },
  {
    fontSize: "14px",
    fontWeight: "normal",
    marginLeft: "2rem",
  },
  {
    fontSize: "14px",
    fontWeight: "normal",
    marginLeft: "3rem",
  },
];

export default function PureOutline({
  headings,
  keywords,
  path = [],
}: PureOutlineProps) {
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const dispatch = useDispatch();

  const toAnchor = (e: React.MouseEvent, anchor: string) => {
    e.stopPropagation();

    const toPath = path.join("-");
    if (getCurrentPath(pathname).join("-") !== toPath) {
      // tell the editor through global opts
      dispatch(updateGlobalOpts({ keys: ["anchor"], values: [anchor] }));

      routerHistory.push(`/article/${toPath}`);
    } else {
      const dom = document.getElementById(anchor);
      const parentDom = document.getElementsByClassName(
        "milkdown"
      )[0] as HTMLElement;

      if (dom) {
        parentDom.scroll({ top: dom.offsetTop, behavior: "smooth" });
      }
      // document
      //   .getElementById(anchor)
      //   ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: 'start' });
    }
  };

  return (
    <>
      {keywords.length !== 0 && (
        <div className="keywords-tags">
          {keywords.map((keyword) => (
            <div
              className="keyword-anchor"
              onClick={(e) =>
                toAnchor(e, keyword.replace(/\s/g, "-").toLowerCase())
              }
              key={keyword}
            >
              {keyword}
            </div>
          ))}
        </div>
      )}
      <br />
      {headings.length !== 0 && (
        <div className="heading-anchors">
          {headings.map((title) => {
            const level = (title.match(/#+/gi) as string[])[0].length;
            const pureHeading = title.replace(/#+\s/g, "");

            return (
              <div
                className="outline-title"
                onClick={(e) =>
                  toAnchor(e, pureHeading.replace(/\s/g, "-").toLowerCase())
                }
                style={{ ...(headingSize[level - 1] ?? {}), color: "black" }}
                key={path.join("-") + title}
              >
                {pureHeading}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
