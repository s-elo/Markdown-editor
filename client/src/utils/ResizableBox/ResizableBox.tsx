/* eslint-disable @typescript-eslint/no-magic-numbers */
import React, { useState, useRef, useLayoutEffect } from 'react';

import ResizeBar from './ResizeBar';
import './ResizableBox.less';

export interface ResizableBoxProps {
  defaultWidth?: number[];
  children: React.ReactChild[];
  effects?: (((boxDom: HTMLDivElement) => void) | null)[];
  effectsDeps?: unknown[];
  boxStyles?: React.CSSProperties[];
  resizeBarStyle?: React.CSSProperties;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function ResizableBox({
  defaultWidth, // default width of the right box
  children,
  effects = [],
  effectsDeps = [],
  boxStyles = [],
  resizeBarStyle = {},
}: ResizableBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<HTMLDivElement[]>([]);

  const [widths, setWidths] = useState<number[]>(
    // need to consider the resize bar width 1%
    defaultWidth?.map((width) => width - 0.01 / children.length) ??
      new Array(children.length).fill(0.99 / children.length),
  );

  const toStr = (n: number) => `${(n * 100).toFixed(2)}%`;

  // execute all the box effects
  useLayoutEffect(() => {
    effects.forEach((effect, idx) => {
      if (effect) {
        effect(boxRefs.current[idx]);
      }
    });
    // eslint-disable-next-line
  }, effectsDeps);

  if (boxStyles.length === 0) boxStyles = new Array(children.length).fill({}) as Record<string, string>[];

  return (
    <div className="resizable-box" ref={containerRef}>
      {children.map((box, idx) => (
        <React.Fragment key={idx}>
          <div
            className="resize-box"
            style={{ width: toStr(widths[idx]), ...boxStyles[idx] }}
            ref={(ref) => ref && (boxRefs.current[idx] = ref)}
          >
            {box}
          </div>

          {idx !== children.length - 1 ? (
            <ResizeBar
              containerRef={containerRef}
              widthChange={(newWidths) => {
                setWidths(newWidths);
              }}
              idx={idx + 1}
              widths={widths}
              style={resizeBarStyle}
            />
          ) : (
            ''
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
