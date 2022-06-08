import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useGetDocQuery } from "@/redux-api/docsApi";

import PureOutline from "./PureOutline";

import type { OutlineProps } from "./Outline";

type OutlineContentType = OutlineProps & {
  mousePos: { x: number; y: number };
  setOutlineShow?: React.Dispatch<React.SetStateAction<boolean>>;
  setOnOutline?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function OutlineContent({
  mousePos: { x, y },
  containerDom,
  setOutlineShow = () => {},
  setOnOutline = () => {},
  path,
}: OutlineContentType) {
  const {
    data: curDoc = { headings: [] as string[], keywords: [] as string[] },
  } = useGetDocQuery(path.join("-"));

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

  const { headings, keywords } = curDoc;

  const outlineDom =
    headings.length === 0 && keywords.length === 0 ? (
      <div>no outline</div>
    ) : (
      <PureOutline headings={headings} keywords={keywords} path={path} />
    );

  return createPortal(outlineDom, divDom);
}
