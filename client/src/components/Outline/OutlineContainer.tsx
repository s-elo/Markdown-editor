import { RefObject, useRef } from 'react';
import { useSelector } from 'react-redux';

import { Outline, OutlineRef } from './Outline';
import { Icon } from '../Icon/Icon';

import { selectCurHeadings, selectCurPath } from '@/redux-feature/curDocSlice';

export const OutlineContainer = () => {
  const outlineRef = useRef<OutlineRef>(null);

  const curPath = useSelector(selectCurPath);
  const headings = useSelector(selectCurHeadings);

  const onCallopseAll = () => {
    outlineRef?.current?.collapseAll();
  };

  return (
    <div className="outline-container">
      <div className="outlint-tool-bar">
        <Icon
          id="outlint-collapse-all"
          iconName="minus-circle"
          onClick={onCallopseAll}
          toolTipContent="Collapse All"
          toolTipPosition="top"
        />
      </div>
      <Outline ref={outlineRef as RefObject<OutlineRef>} headings={headings} path={curPath.split('-')} />
    </div>
  );
};
