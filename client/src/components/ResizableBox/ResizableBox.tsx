import React, { useState, useRef, useEffect } from "react";
import ResizeBar from "./ResizeBar";
import "./ResizableBox.less";

export type ResizableBoxProps = {
  defaultWidth?: string;
  leftBox: () => React.ComponentElement<any, any>;
  rightBox: () => React.ComponentElement<any, any>;
  leftStyle?: React.CSSProperties;
  rightStyle?: React.CSSProperties;
  leftBoxEffect?: (leftRef: React.RefObject<HTMLDivElement>) => void;
  leftBoxEffectDeps?: any[];
  rightBoxEffect?: (rightRef: React.RefObject<HTMLDivElement>) => void;
  rightBoxEffectDeps?: any[];
  resizeBarStyle?: React.CSSProperties;
};

export default function ResizableBox({
  defaultWidth = "50%", // defualt width of the right box
  leftBox,
  rightBox,
  leftStyle = {},
  rightStyle = {},
  leftBoxEffect = (_: React.RefObject<HTMLDivElement>) => {},
  leftBoxEffectDeps = [],
  rightBoxEffect = (_: React.RefObject<HTMLDivElement>) => {},
  rightBoxEffectDeps = [],
  resizeBarStyle = {},
}: ResizableBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState(defaultWidth);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  // left box effect
  // eslint-disable-next-line
  useEffect(() => leftBoxEffect(leftRef), leftBoxEffectDeps);

  // right box effect
  // eslint-disable-next-line
  useEffect(() => rightBoxEffect(rightRef), rightBoxEffectDeps);

  return (
    <div className="resizable-box" ref={containerRef}>
      <div className="left-container" style={leftStyle} ref={leftRef}>
        {leftBox()}
      </div>
      <ResizeBar
        containerRef={containerRef}
        widthChange={(rightWidth) => setRightWidth(rightWidth)}
        style={resizeBarStyle}
      />
      <div
        className="right-container"
        style={{ width: rightWidth, ...rightStyle }}
        ref={rightRef}
      >
        {rightBox()}
      </div>
    </div>
  );
}
