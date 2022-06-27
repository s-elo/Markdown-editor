import React from "react";
import { useEditorScrollToAnchor } from "@/utils/hooks/docHookds";

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
  const scrollToAnchor = useEditorScrollToAnchor();

  const toAnchor = (e: React.MouseEvent, anchor: string) => {
    e.stopPropagation();

    scrollToAnchor(anchor, path.join("-"));
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
                  toAnchor(e, pureHeading)
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
