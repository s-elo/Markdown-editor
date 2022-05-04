import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export type OutlineProps = {
  mousePos: {
    clientX: number;
    clientY: number;
  };
  setOutlineShow?: React.Dispatch<React.SetStateAction<boolean>>;
  containerDom: HTMLElement;
  headings: string[];
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
  headings,
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

  const outlineDom =
    headings.length === 0 ? (
      <div>no outline</div>
    ) : (
      headings.map((title) => {
        const level = (title.match(/#+/gi) as string[])[0].length;

        return (
          <div
            className="outline-title"
            style={{ ...(headingSize[level - 1] ?? {}) }}
          >
            {title.replace(/#+/g, "")}
          </div>
        );
      })
    );

  return createPortal(outlineDom, divDom);
}
