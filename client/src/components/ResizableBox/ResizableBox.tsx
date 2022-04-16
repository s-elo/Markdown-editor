import React, { useState, useRef, useEffect } from "react";
import ResizeBar from "./ResizeBar";
import "./ResizableBox.less";

export type ResizableBoxProps = {
  defaultWidth?: number[];
  children: React.ReactChild[];
  effects: (((boxDom: HTMLDivElement) => void) | null)[];
  effectsDeps: any[];
  boxStyles?: React.CSSProperties[];
  resizeBarStyle?: React.CSSProperties;
};

export default function ResizableBox({
  defaultWidth, // defualt width of the right box
  children,
  effects = [],
  effectsDeps = [],
  boxStyles = [],
  resizeBarStyle = {},
}: ResizableBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<HTMLDivElement[]>([]);

  const [widths, setWidths] = useState<number[]>(
    defaultWidth ?? new Array(children.length).fill(1 / children.length)
  );

  const tostr = (n: number) => `${(n * 100 - 1.5).toFixed(2)}%`;

  // execute all the box effects
  useEffect(() => {
    effects.forEach((effect, idx) => effect && effect(boxRefs.current[idx]));
    // eslint-disable-next-line
  }, effectsDeps);

  if (boxStyles.length === 0) boxStyles = new Array(children.length).fill({});

  return (
    <div className="resizable-box" ref={containerRef}>
      {children.map((box, idx) => (
        <React.Fragment key={idx}>
          <div
            style={{ width: tostr(widths[idx]), ...boxStyles[idx] }}
            ref={(ref) => ref && (boxRefs.current[idx] = ref)}
          >
            {box}
          </div>

          {idx !== children.length - 1 ? (
            <ResizeBar
              containerRef={containerRef}
              widthChange={(widths) => setWidths(widths)}
              idx={idx + 1}
              widths={widths}
              style={resizeBarStyle}
            />
          ) : (
            ""
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
