/* eslint-disable @typescript-eslint/no-magic-numbers */
import React, { useState, useRef } from 'react';

import OutlineContent from './OutlineContent';
import './Outline.less';

export interface OutlineProps {
  containerDom: HTMLElement;
  path: string[];
  posControl?: boolean;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Outline({ containerDom, path, posControl = true }: OutlineProps) {
  const [outlineShow, setOutlineShow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
        className="material-icons-outlined show-outline-icon"
        onClick={showOutline}
        onMouseLeave={mouseLeave}
        title="outline"
      >
        {'segment'}
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
