import React, { useState } from 'react';

import DocMenu from './Menu';

import { DOC } from '@/redux-api/docsApiType';

const styles = {
  rotation: {
    transform: 'rotate(180deg)',
  },
  scale: {
    transform: 'scaleY(1)',
    maxHeight: '1000px',
  },
  hide: {
    transform: 'scaleY(0)',
    maxHeight: '0',
  },
};

// eslint-disable-next-line @typescript-eslint/naming-convention
function Subject({
  doc,
  handleShowMenu,
}: {
  doc: DOC;
  handleShowMenu: (e: React.MouseEvent<HTMLDivElement>, path: string[]) => void;
}) {
  const [expand, setExpand] = useState(false);

  const { rotation, scale, hide } = styles;

  return (
    <>
      <div key={doc.id} className="subject">
        <div
          className="subject-title"
          onClick={() => {
            setExpand((v) => !v);
          }}
          onContextMenu={(e) => {
            handleShowMenu(e, doc.path);
          }}
        >
          {doc.name}
          <span className="material-icons-outlined expand-icon" style={expand ? {} : rotation}>
            expand_less
          </span>
        </div>
        <div className="sub-children" style={expand ? scale : hide}>
          <DocMenu docs={doc.children} />
        </div>
      </div>
    </>
  );
}

export default React.memo(Subject);
