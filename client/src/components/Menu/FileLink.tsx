import React from 'react';
import { Link } from 'react-router-dom';

import Outline from '../Outline/Outline';

import { useSaveDoc } from '@/utils/hooks/reduxHooks';

// eslint-disable-next-line @typescript-eslint/naming-convention
function FileLink({
  path,
  handleShowMenu,
}: {
  path: string[];
  handleShowMenu: (e: React.MouseEvent<HTMLAnchorElement>, path: string[]) => void;
}) {
  const saveDoc = useSaveDoc();

  return (
    <Link
      to={`/article/${path.join('-')}`}
      className={`link file`}
      onContextMenu={(e) => {
        handleShowMenu(e, path);
      }}
      onClick={saveDoc}
    >
      {path[path.length - 1]}
      <Outline containerDom={document.getElementById('container')!} path={path} />
    </Link>
  );
}

export default React.memo(FileLink);
