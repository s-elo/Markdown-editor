import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetNorDocsQuery } from "@/redux-api/docsApi";
import { getCurrentPath } from "@/utils/utils";

export type OutlineProps = {
  containerDom: HTMLElement;
  path: string[];
  iconColor?: string;
  posControl?: boolean;
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
  containerDom,
  path,
  iconColor = "black",
  posControl = true,
}: OutlineProps) {
  const [outlineShow, setOutlineShow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const [onOutline, setOnOutline] = useState(false);
  // if the mouse is on the outline, clear the timer
  if (onOutline && timerRef.current) clearTimeout(timerRef.current);

  const [outlinePos, setOutlinePos] = useState({
    x: 0,
    y: 0,
  });

  const showOutline = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = e;

    if (posControl) {
      setOutlinePos({
        x: clientX,
        y: clientY,
      });
    } else {
      setOutlinePos({ x: 0, y: 0 });
    }

    setOutlineShow(true);
  };

  const mouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setOutlineShow(false);
    }, 1000);
  };

  return (
    // if it is rendered through reactDOM.render, the redux value will not be passed
    // as well as the router info
    <>
      <span
        style={{ color: iconColor }}
        className="material-icons-outlined show-outline-icon"
        onClick={showOutline}
        onMouseLeave={mouseLeave}
        title="outline"
      >
        {"segment"}
      </span>
      {outlineShow && (
        <OutlineContent
          mousePos={outlinePos}
          path={path}
          containerDom={containerDom}
          setOutlineShow={setOutlineShow}
          setOnOutline={setOnOutline}
        />
      )}
    </>
  );
}

type OutlineContentType = OutlineProps & {
  mousePos: { x: number; y: number };
  setOutlineShow?: React.Dispatch<React.SetStateAction<boolean>>;
  setOnOutline?: React.Dispatch<React.SetStateAction<boolean>>;
};
const OutlineContent = ({
  mousePos: { x, y },
  containerDom,
  setOutlineShow = () => {},
  setOnOutline = () => {},
  path,
}: OutlineContentType) => {
  const { data: norDocs = {} } = useGetNorDocsQuery();
  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const dispatch = useDispatch();

  const mouseEnterEvent = () => {
    setOnOutline(true);
  };

  const mouseLeaveEvent = () => {
    setOutlineShow(false);
    setOnOutline(false);
  };

  const contextEvent = (e: MouseEvent) => {
    e.preventDefault();
    // for native event
    e.stopImmediatePropagation();
  };

  const divDom = useMemo(() => {
    const divDom = document.createElement("div");

    divDom.classList.add("content-outline");

    // show at proper position
    const left = x - containerDom.offsetLeft + containerDom.scrollLeft;
    const top = y - containerDom.offsetTop + containerDom.scrollTop;

    if (x + 350 >= document.body.clientWidth) {
      divDom.style.right =
        document.body.clientWidth - (x + containerDom.scrollLeft + 60) + "px";
    } else {
      divDom.style.left = left + "px";
    }

    if (y + 350 >= document.body.clientHeight) {
      divDom.style.bottom =
        document.body.clientHeight - (y + containerDom.scrollTop) + "px";
    } else {
      divDom.style.top = top + "px";
    }
    divDom.addEventListener("mouseenter", mouseEnterEvent);
    divDom.addEventListener("mouseleave", mouseLeaveEvent);
    divDom.addEventListener("contextmenu", contextEvent);

    return divDom;
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    containerDom?.appendChild(divDom);
    return () => {
      containerDom?.removeChild(divDom);
      divDom.removeEventListener("mouseenter", mouseEnterEvent);
      divDom.removeEventListener("mouseleave", mouseLeaveEvent);
      divDom.removeEventListener("contextmenu", contextEvent);
    };
    // eslint-disable-next-line
  }, [containerDom, divDom]);

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

  const { headings, keywords } = norDocs[path.join("-")].doc;

  const outlineDom =
    headings.length === 0 ? (
      <div>no outline</div>
    ) : (
      <>
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
        <br />
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
      </>
    );

  return createPortal(outlineDom, divDom);
};
