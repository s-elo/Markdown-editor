import React, { useRef } from "react";
import { dragEventBinder } from "@/utils/utils";

export default function ResizeBar({
  containerRef,
  widthChange,
  style = {},
  idx,
  widths,
}: {
  containerRef: React.RefObject<HTMLElement>;
  widthChange: (widths: number[]) => void;
  style?: any;
  idx: number;
  widths: number[];
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const dragStart = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();

    dragEventBinder((e: MouseEvent) => {
      if (containerRef.current && barRef.current) {
        // the previous left side width of the current bar
        const prevLeftTotalWidthPercent = widths
          .slice(idx)
          .reduce((total, width) => total + width, 0);

        // the distance from the current bar to the left side of the father container
        const offsetLeft = e.clientX - containerRef.current.offsetLeft;

        // the left side width of the current bar
        const leftTotalWidthPercent =
          1 -
          offsetLeft /
            Number(
              getComputedStyle(containerRef.current).width.replace("px", "")
            );

        // get the diff
        const widthDiff = leftTotalWidthPercent - prevLeftTotalWidthPercent;

        // cur width is the right box of the current bar
        const curWidthPercent = widths[idx] + widthDiff;
        // last width is the left box of the current bar
        const lastWidthPercent = widths[idx - 1] - widthDiff;

        widthChange(
          [...widths].map((widthPercent, index) => {
            if (index === idx) {
              return curWidthPercent;
            }

            if (index === idx - 1) {
              return lastWidthPercent;
            }

            // only change the widths of the boxs aside the current bar
            // others remain the previous width
            return widthPercent;
          })
        );
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
