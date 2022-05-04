import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export type OutlineProps = {
  mousePos: {
    clientX: number;
    clientY: number;
  };
  setOutlineShow?: React.Dispatch<React.SetStateAction<boolean>>;
  containerDom: HTMLElement;
};

export default function Outline({
  mousePos: { clientX, clientY },
  setOutlineShow,
  containerDom,
}: OutlineProps) {
  const divDom = document.createElement("div");

  divDom.classList.add("content-outline");
  divDom.style.left = clientX + "px";
  if (clientY + 300 >= document.body.clientHeight) {
    divDom.style.bottom = document.body.clientHeight - clientY + "px";
  } else {
    divDom.style.top = clientY + "px";
  }

  setOutlineShow &&
    divDom.addEventListener("mouseleave", () => {
      setOutlineShow(false);
    });

  useEffect(() => {
    containerDom?.appendChild(divDom);
    return () => {
      containerDom?.removeChild(divDom);
    };
  }, [containerDom, divDom]);

  const outlineDom = <div>Outline</div>;

  return createPortal(outlineDom, divDom);
}
