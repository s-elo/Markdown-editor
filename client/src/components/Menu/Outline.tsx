import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocMenuQuery } from "@/redux-api/docsApi";
import { getCurrentPath } from "@/utils/utils";

export type OutlineProps = {
  mousePos: {
    clientX: number;
    clientY: number;
  };
  setOutlineShow?: React.Dispatch<React.SetStateAction<boolean>>;
  containerDom: HTMLElement;
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
];

export default function Outline({
  mousePos: { clientX, clientY },
  setOutlineShow,
  containerDom,
  path,
}: OutlineProps) {
  const divDom = document.createElement("div");

  divDom.classList.add("content-outline");
  divDom.style.left = clientX + "px";
  if (clientY + 300 >= document.body.clientHeight) {
    divDom.style.bottom = document.body.clientHeight - clientY + "px";
  } else {
    divDom.style.top = clientY + "px";
  }

  const mouseLeaveEvent = () => {
    setOutlineShow && setOutlineShow(false);
  };
  divDom.addEventListener("mouseleave", mouseLeaveEvent);

  const contextEvent = (e: MouseEvent) => {
    e.preventDefault();
    // for native event
    e.stopImmediatePropagation();
  };
  divDom.addEventListener("contextmenu", contextEvent);

  useEffect(() => {
    containerDom?.appendChild(divDom);
    return () => {
      containerDom?.removeChild(divDom);
      divDom.removeEventListener("mouseleave", mouseLeaveEvent);
      divDom.removeEventListener("contextmenu", contextEvent);
    };
    // eslint-disable-next-line
  }, [containerDom, divDom]);

  const { data: { norDocs } = { norDocs: {} } } = useGetDocMenuQuery();
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const dispatch = useDispatch();

  const headings = norDocs[path.join("-")].headings;

  const toAnchor = (e: React.MouseEvent, anchor: string) => {
    e.stopPropagation();

    const toPath = path.join("-");

    if (getCurrentPath(pathname).join("-") !== toPath) {
      // tell the editor through global opts
      dispatch(updateGlobalOpts({ keys: ["anchor"], values: [anchor] }));

      routerHistory.push(`/article/${toPath}`);
    } else {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const outlineDom =
    headings.length === 0 ? (
      <div>no outline</div>
    ) : (
      headings.map((title) => {
        const level = (title.match(/#+/gi) as string[])[0].length;
        const pureHeading = title.replace(/#+\s/g, "");

        return (
          <div
            className="outline-title"
            onClick={(e) =>
              toAnchor(e, pureHeading.replace(/\s/g, "-").toLowerCase())
            }
            style={{ ...(headingSize[level - 1] ?? {}) }}
            key={title}
          >
            {pureHeading}
          </div>
        );
      })
    );

  return createPortal(outlineDom, divDom);
}
