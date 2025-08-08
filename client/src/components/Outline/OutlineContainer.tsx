import { RefObject, useRef } from 'react';
import { useSelector } from 'react-redux';

import { Outline, OutlineRef } from './Outline';
import { Icon } from '../Icon/Icon';

import { useGetDocQuery } from '@/redux-api/docs';
import { selectCurPath } from '@/redux-feature/curDocSlice';

export const OutlineContainer = () => {
  const outlineRef = useRef<OutlineRef>(null);

  const curPath = useSelector(selectCurPath);
  const { data: curDoc } = useGetDocQuery(curPath);
  const { headings, keywords } = curDoc ?? { headings: [] as string[], keywords: [] as string[] };

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
      <Outline
        ref={outlineRef as RefObject<OutlineRef>}
        headings={headings}
        keywords={keywords}
        path={curPath.split('-')}
      />
    </div>
  );
};
