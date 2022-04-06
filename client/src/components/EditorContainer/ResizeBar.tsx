import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { selectGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { dragEventBinder } from "@/utils/utils";

export default function ResizeBar({
  containerRef,
  widthChange,
}: {
  containerRef: React.RefObject<HTMLElement>;
  widthChange: (mirrorWidth: string) => void;
}) {
  const { mirrorCollapse } = useSelector(selectGlobalOpts);

  const barRef = useRef<HTMLDivElement>(null);

  const startChangeWidth = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();

    dragEventBinder((e: MouseEvent) => {
      if (containerRef.current && barRef.current) {
        const offsetLeft = e.clientX - containerRef.current.offsetLeft;

        const widthPercentage =
          1 -
          offsetLeft /
            Number(
              getComputedStyle(containerRef.current).width.replace("px", "")
            );

        widthChange(`${(widthPercentage * 100 - 1.5).toFixed(2)}%`);
      }
    });
  };
  return (
    <div
      className="resize-bar"
      // avoid the vibrating
      style={{ visibility: mirrorCollapse ? "hidden" : "visible" }}
      ref={barRef}
      onMouseDown={startChangeWidth}
    ></div>
  );
}
