import React, { useRef } from "react";
import { dragEventBinder } from "@/utils/utils";

export default function ResizeBar({
  containerRef,
  widthChange,
  style = {},
}: {
  containerRef: React.RefObject<HTMLElement>;
  widthChange: (mirrorWidth: string) => void;
  style?: React.CSSProperties;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const dragStart = (e: React.MouseEvent<HTMLElement>) => {
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
      ref={barRef}
      onMouseDown={dragStart}
      style={style}
    ></div>
  );
}
